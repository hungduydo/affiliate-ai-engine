import { Controller, Post, Get, Param, Body, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QueueService } from '../../queue-engine/queue.service';
import { QUEUE_NAMES, JobName } from '../../queue-engine/queue.constants';
import { IngestProductsDto } from './dto/ingest-products.dto';

@ApiTags('source-connector')
@Controller('api/source-connector')
export class SourceController {
  constructor(private readonly queueService: QueueService) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Start product ingestion job from a source connector' })
  async ingest(@Body() dto: IngestProductsDto) {
    const jobId = await this.queueService.addJob(
      QUEUE_NAMES.PRODUCT_INGESTION,
      JobName.SCRAPE_PRODUCT,
      { source: dto.source, keyword: dto.keyword, limit: dto.limit },
    );
    return { jobId, status: 'queued' };
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get ingestion job status' })
  async getJobStatus(@Param('jobId') jobId: string) {
    const queue = await this.queueService.getQueue(QUEUE_NAMES.PRODUCT_INGESTION);
    if (!queue) throw new NotFoundException('Queue not found');

    const job = await queue.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    const state = await job.getState();
    return {
      id: jobId,
      name: job.name,
      state,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      progress: job.progress,
      createdAt: new Date(job.timestamp).toISOString(),
    };
  }
}
