import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ISourceAdapter, ScrapedProduct } from '../../../domain/adapters/source.adapter.interface';
import { mapCJProduct, CJProduct } from './cj.mapper';

interface CJSearchResponse {
  products?: {
    product?: CJProduct[];
  };
}

@Injectable()
export class CJAdapter implements ISourceAdapter {
  readonly source = 'cj';
  private readonly logger = new Logger(CJAdapter.name);
  private readonly baseUrl = 'https://product-search.api.cj.com/v2/product-search';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async fetchProducts(keyword: string, limit: number): Promise<ScrapedProduct[]> {
    const apiToken = this.config.getOrThrow<string>('CJ_API_TOKEN');
    const websiteId = this.config.getOrThrow<string>('CJ_WEBSITE_ID');

    const response = await firstValueFrom(
      this.http.get<CJSearchResponse>(this.baseUrl, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: 'application/json',
        },
        params: {
          'website-id': websiteId,
          keywords: keyword,
          'records-per-page': Math.min(limit, 1000),
        },
      }),
    );

    const items = response.data?.products?.product ?? [];
    this.logger.log(`CJ returned ${items.length} results for keyword: ${keyword}`);
    return items.map(mapCJProduct);
  }
}
