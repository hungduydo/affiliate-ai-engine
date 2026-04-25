import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ISourceAdapter, ScrapedProduct } from '../../../domain/adapters/source.adapter.interface';
import { FilterResult, mapVideoToProduct } from './trending-video.mapper';

interface JobResponse {
  job_id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  results?: FilterResult[];
  error?: string;
}

@Injectable()
export class TrendingVideoAdapter implements ISourceAdapter {
  readonly source = 'trending-video';
  private readonly logger = new Logger(TrendingVideoAdapter.name);
  private readonly POLL_INTERVAL_MS = 3000;
  private readonly POLL_TIMEOUT_MS = 120_000;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async fetchProducts(keyword: string, limit: number): Promise<ScrapedProduct[]> {
    const base = this.config.get<string>('FLOW_SEARCH_URL', 'http://localhost:8000');

    const { data: job } = await firstValueFrom(
      this.http.post<{ job_id: string }>(`${base}/jobs`, { keywords: [keyword] }),
    );

    this.logger.log(`flow-search job started: ${job.job_id} for keyword "${keyword}"`);

    const results = await this.pollUntilDone(base, job.job_id);
    const approved = results.filter((r) => r.is_approved).slice(0, limit);

    this.logger.log(`flow-search returned ${approved.length} approved videos (limit ${limit})`);
    return approved.map((r) => mapVideoToProduct(r.video));
  }

  private async pollUntilDone(base: string, jobId: string): Promise<FilterResult[]> {
    const deadline = Date.now() + this.POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, this.POLL_INTERVAL_MS));

      const { data } = await firstValueFrom(
        this.http.get<JobResponse>(`${base}/jobs/${jobId}`),
      );

      if (data.status === 'done') {
        return data.results ?? [];
      }

      if (data.status === 'failed') {
        throw new Error(`flow-search job ${jobId} failed: ${data.error ?? 'unknown error'}`);
      }
    }

    throw new Error(`flow-search job ${jobId} timed out after ${this.POLL_TIMEOUT_MS / 1000}s`);
  }
}
