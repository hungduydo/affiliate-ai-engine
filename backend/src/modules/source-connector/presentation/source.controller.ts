import { Controller, Post, Get, Param, Query, Body, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { QueueService } from '../../queue-engine/queue.service';
import { QUEUE_NAMES, JobName } from '../../queue-engine/queue.constants';
import { IngestProductsDto } from './dto/ingest-products.dto';
import { EnrichBatchDto } from './dto/enrich-batch.dto';
import { ProductEnrichmentService } from '../application/product-enrichment.service';

const VALID_QUEUES = Object.values(QUEUE_NAMES) as string[];

@ApiTags('source-connector')
@Controller('source-connector')
export class SourceController {
  private readonly internalProductsUrl: string;

  constructor(
    private readonly queueService: QueueService,
    private readonly enrichmentService: ProductEnrichmentService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const backendUrl = this.config.get<string>('BACKEND_INTERNAL_URL', 'http://localhost:3000');
    this.internalProductsUrl = `${backendUrl}/api/internal/products`;
  }

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

  @Post('enrich/:id')
  @ApiOperation({ summary: 'Enqueue a detail enrichment job for a single product' })
  async enrichOne(@Param('id') id: string) {
    const product = await this.fetchProduct(id);
    const jobId = await this.enrichmentService.enqueueEnrich({
      productId: id,
      productLink: product.productLink ?? '',
      externalId: product.externalId,
      source: product.source,
    }, 0);
    return { jobId, status: 'queued' };
  }

  @Post('enrich-batch')
  @ApiOperation({ summary: 'Enqueue detail enrichment jobs for multiple products (staggered)' })
  async enrichBatch(@Body() dto: EnrichBatchDto) {
    const items = await Promise.all(
      dto.productIds.map(async (id) => {
        const p = await this.fetchProduct(id);
        return {
          productId: id,
          productLink: p.productLink ?? '',
          externalId: p.externalId,
          source: p.source,
        };
      }),
    );
    const jobIds = await this.enrichmentService.enqueueBatch(items);
    return { jobIds, count: jobIds.length, status: 'queued' };
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get job status (use ?queue= for enrichment queue)' })
  @ApiQuery({ name: 'queue', required: false, description: 'Queue name (default: product-ingestion)' })
  async getJobStatus(@Param('jobId') jobId: string, @Query('queue') queueName?: string) {
    const resolvedQueue = queueName && VALID_QUEUES.includes(queueName)
      ? queueName
      : QUEUE_NAMES.PRODUCT_INGESTION;

    const queue = await this.queueService.getQueue(resolvedQueue);
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

  private async fetchProduct(id: string) {
    const res = await firstValueFrom(
      this.http.get<{ id: string; productLink: string | null; externalId: string; source: string }>(
        `${this.internalProductsUrl}/${id}`,
      ),
    );
    return res.data;
  }
}
