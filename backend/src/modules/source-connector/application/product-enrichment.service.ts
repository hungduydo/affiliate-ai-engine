import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IProductDetailFetcher } from '../domain/adapters/product-detail-fetcher.interface';
import { ShopeeDetailFetcher } from '../infrastructure/adapters/shopee/shopee.detail-fetcher';
import { LazadaDetailFetcher } from '../infrastructure/adapters/lazada/lazada.detail-fetcher';
import { QueueService } from '../../queue-engine/queue.service';
import { QUEUE_NAMES, JobName } from '../../queue-engine/queue.constants';

export interface EnrichJobParams {
  productId: string;
  productLink: string;
  externalId: string;
  source: string;
}

export interface EnrichResult {
  status: 'ok' | 'skipped' | 'unsupported' | 'error';
  error?: string;
}

@Injectable()
export class ProductEnrichmentService {
  private readonly logger = new Logger(ProductEnrichmentService.name);
  private readonly fetchers: Map<string, IProductDetailFetcher>;
  private readonly internalProductsUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly shopeeFetcher: ShopeeDetailFetcher,
    private readonly lazadaFetcher: LazadaDetailFetcher,
    private readonly queueService: QueueService,
  ) {
    this.fetchers = new Map<string, IProductDetailFetcher>([
      ['shopee', this.shopeeFetcher],
      ['lazada', this.lazadaFetcher],
    ]);

    const backendUrl = this.config.get<string>('BACKEND_INTERNAL_URL', 'http://localhost:3000');
    this.internalProductsUrl = `${backendUrl}/api/internal/products`;
  }

  async enrichProduct(params: EnrichJobParams): Promise<EnrichResult> {
    const { productId, source } = params;

    // If productLink or externalId are missing (e.g. auto-enrich after CSV), fetch from internal API
    let productLink = params.productLink;
    let externalId = params.externalId;
    if (!productLink || !externalId) {
      try {
        const res = await firstValueFrom(
          this.http.get<{ productLink: string | null; externalId: string }>(
            `${this.internalProductsUrl}/${productId}`,
          ),
        );
        productLink = res.data.productLink ?? '';
        externalId = res.data.externalId ?? externalId;
      } catch {
        await this.patchEnrichStatus(productId, 'SKIPPED');
        return { status: 'skipped' };
      }
    }

    if (!productLink) {
      await this.patchEnrichStatus(productId, 'SKIPPED');
      return { status: 'skipped' };
    }

    const fetcher = this.fetchers.get(source);
    if (!fetcher) {
      this.logger.warn(`No detail fetcher for source: ${source}`);
      await this.patchEnrichStatus(productId, 'SKIPPED');
      return { status: 'unsupported' };
    }

    // Signal that enrichment is in progress
    await this.patchEnrichStatus(productId, 'ENRICHING');

    try {
      const detail = await fetcher.fetchDetail(productLink, externalId);
      if (!detail) {
        await this.patchEnrichStatus(productId, 'FAILED');
        return { status: 'error', error: 'No detail data intercepted' };
      }

      await firstValueFrom(
        this.http.patch(`${this.internalProductsUrl}/${productId}/enrich`, {
          ...detail,
          enrichStatus: 'DONE',
        }),
      );

      this.logger.log(`Product ${productId} enriched from ${source}`);
      return { status: 'ok' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to enrich product ${productId}: ${message}`);
      await this.patchEnrichStatus(productId, 'FAILED');
      return { status: 'error', error: message };
    }
  }

  async enqueueEnrich(params: EnrichJobParams, delayMs?: number): Promise<string> {
    const delay = delayMs ?? parseInt(this.config.get('ENRICHMENT_JOB_DELAY_MS', '5000'));
    return this.queueService.addJob(
      QUEUE_NAMES.PRODUCT_ENRICHMENT,
      JobName.ENRICH_PRODUCT,
      params as unknown as Record<string, unknown>,
      { delay, attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    );
  }

  async enqueueBatch(items: EnrichJobParams[]): Promise<string[]> {
    const baseDelay = parseInt(this.config.get('ENRICHMENT_JOB_DELAY_MS', '5000'));
    const jobIds: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const jobId = await this.enqueueEnrich(items[i], baseDelay * i);
      jobIds.push(jobId);
    }
    return jobIds;
  }

  private async patchEnrichStatus(productId: string, enrichStatus: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${this.internalProductsUrl}/${productId}/enrich`, { enrichStatus }),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to update enrichStatus for ${productId}: ${message}`);
    }
  }
}
