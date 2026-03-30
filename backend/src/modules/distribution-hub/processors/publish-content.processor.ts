import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, JobName } from '../../queue-engine/queue.constants';
import { PublishContentService } from '../application/publish-content.service';

@Injectable()
export class PublishContentProcessor {
  private readonly logger = new Logger(PublishContentProcessor.name);
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly publishContentService: PublishContentService,
  ) {}

  start() {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
    };

    this.worker = new Worker(
      QUEUE_NAMES.DISTRIBUTION,
      async (job: Job) => this.process(job),
      { connection, concurrency: 3 },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Publish job completed: ${job.id}`);
    });
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Publish job failed: ${job?.id}: ${error.message}`);
    });

    this.logger.log('PublishContent worker started');
  }

  private async process(job: Job) {
    this.logger.log(`Processing ${job.name} job ${job.id}`);

    if (job.name === JobName.PUBLISH_CONTENT) {
      const { publishLogId } = job.data as { publishLogId: string };
      await this.publishContentService.publish(publishLogId);
      return { publishLogId, status: 'published' };
    }

    throw new Error(`Unknown job name: ${job.name}`);
  }

  async stop() {
    await this.worker?.close();
  }
}
