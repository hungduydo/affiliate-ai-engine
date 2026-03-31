import { Injectable, Logger } from '@nestjs/common';
import { Queue, JobsOptions } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, JobName } from './queue.constants';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private queues: Map<string, Queue> = new Map();

  constructor(private readonly config: ConfigService) {
    this.initQueues();
  }

  private getRedisConnection() {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
    };
  }

  private initQueues() {
    const connection = this.getRedisConnection();
    for (const name of Object.values(QUEUE_NAMES)) {
      this.queues.set(name, new Queue(name, { connection }));
    }
    this.logger.log(`Queues initialized: ${Object.values(QUEUE_NAMES).join(', ')}`);
  }

  async addJob(
    queueName: string,
    jobName: JobName,
    data: Record<string, unknown>,
    options?: Pick<JobsOptions, 'delay' | 'attempts' | 'backoff'>,
  ): Promise<string> {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const job = await queue.add(jobName, data, {
      attempts: options?.attempts ?? 3,
      backoff: options?.backoff ?? { type: 'exponential', delay: 5000 },
      delay: options?.delay,
    });

    this.logger.log(`Job added: ${jobName} (${job.id}) to queue ${queueName}`);
    return String(job.id);
  }

  async getQueue(name: string): Promise<Queue | undefined> {
    return this.queues.get(name);
  }

  async closeAll() {
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.log(`Queue closed: ${name}`);
    }
  }
}
