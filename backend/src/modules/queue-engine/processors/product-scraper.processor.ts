import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, JobName } from '../queue.constants';
import { ProductIngestionService } from '../../source-connector/application/product-ingestion.service';
import { CsvFieldMapping } from '../../source-connector/infrastructure/csv/csv.importer';

@Injectable()
export class ProductScraperProcessor {
  private readonly logger = new Logger(ProductScraperProcessor.name);
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly ingestionService: ProductIngestionService,
  ) {}

  start() {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
    };

    this.worker = new Worker(
      QUEUE_NAMES.PRODUCT_INGESTION,
      async (job: Job) => this.process(job),
      { connection, concurrency: 3 },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Job completed: ${job.name} (${job.id})`);
    });
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Job failed: ${job?.name} (${job?.id}): ${error.message}`);
    });

    this.logger.log('ProductScraper worker started');
  }

  private async process(job: Job) {
    this.logger.log(`Processing job ${job.name} (${job.id})`);

    switch (job.name) {
      case JobName.SCRAPE_PRODUCT:
        return this.scrapeProduct(job.data);
      case JobName.IMPORT_CSV:
        return this.importCsv(job.data);
      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  }

  private async scrapeProduct(data: { source: string; keyword: string; limit: number }) {
    return this.ingestionService.ingest({ source: data.source, keyword: data.keyword, limit: data.limit });
  }

  private async importCsv(data: { filePath: string; mapping: CsvFieldMapping; source: string }) {
    return this.ingestionService.importCsv({ filePath: data.filePath, mapping: data.mapping, source: data.source });
  }

  async stop() {
    await this.worker?.close();
  }
}
