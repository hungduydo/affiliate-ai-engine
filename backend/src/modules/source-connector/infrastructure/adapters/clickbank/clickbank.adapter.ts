import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ISourceAdapter, ScrapedProduct } from '../../../domain/adapters/source.adapter.interface';
import { mapClickBankItem, ClickBankMarketplaceItem } from './clickbank.mapper';

interface ClickBankSearchResponse {
  results?: ClickBankMarketplaceItem[];
}

@Injectable()
export class ClickBankAdapter implements ISourceAdapter {
  readonly source = 'clickbank';
  private readonly logger = new Logger(ClickBankAdapter.name);
  private readonly baseUrl = 'https://api.clickbank.com/rest/1.3';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async fetchProducts(keyword: string, limit: number): Promise<ScrapedProduct[]> {
    const devApiKey = this.config.getOrThrow<string>('CLICKBANK_DEV_API_KEY');
    const clerkId = this.config.getOrThrow<string>('CLICKBANK_CLERK_ID');

    const response = await firstValueFrom(
      this.http.get<ClickBankSearchResponse>(`${this.baseUrl}/marketplace/search`, {
        headers: {
          Authorization: `${devApiKey}:${clerkId}`,
          Accept: 'application/json',
        },
        params: {
          keywords: keyword,
          resultsPerPage: Math.min(limit, 100),
          page: 1,
        },
      }),
    );

    const items = response.data?.results ?? [];
    this.logger.log(`ClickBank returned ${items.length} results for keyword: ${keyword}`);
    return items.map((item) => mapClickBankItem(item, clerkId));
  }
}
