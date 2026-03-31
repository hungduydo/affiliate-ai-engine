import { Injectable, Module, OnApplicationBootstrap } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClickBankAdapter } from './infrastructure/adapters/clickbank/clickbank.adapter';
import { CJAdapter } from './infrastructure/adapters/cj/cj.adapter';
import { ShopeePlaywrightAdapter } from './infrastructure/adapters/shopee/shopee.playwright.adapter';
import { ShopeeDetailFetcher } from './infrastructure/adapters/shopee/shopee.detail-fetcher';
import { LazadaDetailFetcher } from './infrastructure/adapters/lazada/lazada.detail-fetcher';
import { CsvImporter } from './infrastructure/csv/csv.importer';
import { ProductIngestionService } from './application/product-ingestion.service';
import { ProductEnrichmentService } from './application/product-enrichment.service';
import { ProductScraperProcessor } from '../queue-engine/processors/product-scraper.processor';
import { ProductEnrichmentProcessor } from '../queue-engine/processors/product-enrichment.processor';
import { SourceController } from './presentation/source.controller';
import { CsvController } from './presentation/csv.controller';
import { QueueEngineModule } from '../queue-engine/queue-engine.module';

@Injectable()
class SourceConnectorBootstrap implements OnApplicationBootstrap {
  constructor(private readonly processor: ProductScraperProcessor) {}
  onApplicationBootstrap() {
    this.processor.start();
  }
}

@Injectable()
class EnrichmentBootstrap implements OnApplicationBootstrap {
  constructor(private readonly processor: ProductEnrichmentProcessor) {}
  onApplicationBootstrap() {
    this.processor.start();
  }
}

@Module({
  imports: [HttpModule, QueueEngineModule],
  providers: [
    ClickBankAdapter,
    CJAdapter,
    ShopeePlaywrightAdapter,
    ShopeeDetailFetcher,
    LazadaDetailFetcher,
    CsvImporter,
    ProductIngestionService,
    ProductEnrichmentService,
    ProductScraperProcessor,
    ProductEnrichmentProcessor,
    SourceConnectorBootstrap,
    EnrichmentBootstrap,
  ],
  controllers: [SourceController, CsvController],
  exports: [ProductIngestionService, ProductEnrichmentService],
})
export class SourceConnectorModule {}
