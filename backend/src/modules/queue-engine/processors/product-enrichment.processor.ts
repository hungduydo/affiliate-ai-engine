import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, JobName } from '../queue.constants';
import { ProductEnrichmentService, EnrichJobParams } from '../../source-connector/application/product-enrichment.service';

@Injectable()
export class ProductEnrichmentProcessor {
  private readonly logger = new Logger(ProductEnrichmentProcessor.name);
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly enrichmentService: ProductEnrichmentService,
  ) {}

  start() {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
    };

    const concurrency = parseInt(this.config.get('ENRICHMENT_CONCURRENCY', '1'));

    this.worker = new Worker(
      QUEUE_NAMES.PRODUCT_ENRICHMENT,
      async (job: Job) => this.process(job),
      { connection, concurrency },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Enrichment job completed: ${job.name} (${job.id})`);
    });
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Enrichment job failed: ${job?.name} (${job?.id}): ${error.message}`);
    });

    this.logger.log(`ProductEnrichment worker started (concurrency: ${concurrency})`);
  }

  private async process(job: Job) {
    this.logger.log(`Processing enrichment job ${job.name} (${job.id})`);

    if (job.name === JobName.ENRICH_PRODUCT) {
      return this.enrichmentService.enrichProduct(job.data as EnrichJobParams);
    }
    throw new Error(`Unknown enrichment job: ${job.name}`);
  }

  async stop() {
    await this.worker?.close();
  }
}
