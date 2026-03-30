import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ISourceAdapter, ScrapedProduct } from '../domain/adapters/source.adapter.interface';
import { ClickBankAdapter } from '../infrastructure/adapters/clickbank/clickbank.adapter';
import { CJAdapter } from '../infrastructure/adapters/cj/cj.adapter';
import { ShopeePlaywrightAdapter } from '../infrastructure/adapters/shopee/shopee.playwright.adapter';
import { CsvImporter, CsvFieldMapping } from '../infrastructure/csv/csv.importer';

export interface IngestParams {
  source: string;
  keyword: string;
  limit: number;
}

export interface IngestResult {
  saved: number;
  skipped: number;
  errors: number;
}

@Injectable()
export class ProductIngestionService {
  private readonly logger = new Logger(ProductIngestionService.name);
  private readonly adapters: Map<string, ISourceAdapter>;
  private readonly internalProductsUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly clickBankAdapter: ClickBankAdapter,
    private readonly cjAdapter: CJAdapter,
    private readonly shopeeAdapter: ShopeePlaywrightAdapter,
    private readonly csvImporter: CsvImporter,
  ) {
    this.adapters = new Map<string, ISourceAdapter>([
      ['clickbank', this.clickBankAdapter],
      ['cj', this.cjAdapter],
      ['shopee', this.shopeeAdapter],
    ]);

    const backendUrl = this.config.get<string>('BACKEND_INTERNAL_URL', 'http://localhost:3000');
    this.internalProductsUrl = `${backendUrl}/api/internal/products`;
  }

  async ingest(params: IngestParams): Promise<IngestResult> {
    const adapter = this.adapters.get(params.source);
    if (!adapter) {
      throw new Error(`Unknown source: ${params.source}. Available: ${[...this.adapters.keys()].join(', ')}`);
    }

    const products = await adapter.fetchProducts(params.keyword, params.limit);
    this.logger.log(`Fetched ${products.length} products from ${params.source}`);

    return this.saveProducts(products);
  }

  async importCsv(params: {
    filePath: string;
    mapping: CsvFieldMapping;
    source: string;
  }): Promise<IngestResult> {
    const products = await this.csvImporter.parse(params.filePath, params.mapping, params.source);
    this.logger.log(`Parsed ${products.length} products from CSV`);
    return this.saveProducts(products);
  }

  private async saveProducts(products: ScrapedProduct[]): Promise<IngestResult> {
    let saved = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products) {
      try {
        await firstValueFrom(
          this.http.post(this.internalProductsUrl, {
            externalId: product.externalId,
            source: product.source,
            name: product.name,
            description: product.description,
            price: product.price,
            commission: product.commission,
            imageUrl: product.imageUrl,
            rawData: product.rawData,
          }),
        );
        saved++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to save product ${product.externalId}: ${message}`);
        errors++;
      }
    }

    this.logger.log(`Ingestion complete: saved=${saved}, skipped=${skipped}, errors=${errors}`);
    return { saved, skipped, errors };
  }
}
