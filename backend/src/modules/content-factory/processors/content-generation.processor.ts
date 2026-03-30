import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, JobName } from '../../queue-engine/queue.constants';
import { ContentGenerationService } from '../application/content-generation.service';

@Injectable()
export class ContentGenerationProcessor {
  private readonly logger = new Logger(ContentGenerationProcessor.name);
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly contentGenerationService: ContentGenerationService,
  ) {}

  start() {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
    };

    this.worker = new Worker(
      QUEUE_NAMES.CONTENT_GENERATION,
      async (job: Job) => this.process(job),
      { connection, concurrency: 2 },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Content generation job completed: ${job.id}`);
    });
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Content generation job failed: ${job?.id}: ${error.message}`);
    });

    this.logger.log('ContentGeneration worker started');
  }

  private async process(job: Job) {
    this.logger.log(`Processing ${job.name} job ${job.id}`);

    if (job.name === JobName.GENERATE_CONTENT) {
      const { contentId } = job.data as { contentId: string };
      await this.contentGenerationService.generate(contentId);
      return { contentId, status: 'generated' };
    }

    throw new Error(`Unknown job name: ${job.name}`);
  }

  async stop() {
    await this.worker?.close();
  }
}
