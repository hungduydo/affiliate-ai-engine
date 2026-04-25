import { Injectable, Module, OnApplicationBootstrap } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShopeePlaywrightAdapter } from './infrastructure/adapters/shopee/shopee.playwright.adapter';
import { ShopeeDetailFetcher } from './infrastructure/adapters/shopee/shopee.detail-fetcher';
import { LazadaDetailFetcher } from './infrastructure/adapters/lazada/lazada.detail-fetcher';
import { CsvImporter } from './infrastructure/csv/csv.importer';
import { TrendingVideoAdapter } from './infrastructure/adapters/trending-video/trending-video.adapter';
import { ProductIngestionService } from './application/product-ingestion.service';
import { ProductEnrichmentService } from './application/product-enrichment.service';
import { ProductDiscoveryService } from './application/product-discovery.service';
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
    ShopeePlaywrightAdapter,
    ShopeeDetailFetcher,
    LazadaDetailFetcher,
    CsvImporter,
    TrendingVideoAdapter,
    ProductIngestionService,
    ProductEnrichmentService,
    ProductDiscoveryService,
    ProductScraperProcessor,
    ProductEnrichmentProcessor,
    SourceConnectorBootstrap,
    EnrichmentBootstrap,
  ],
  controllers: [SourceController, CsvController],
  exports: [ProductIngestionService, ProductEnrichmentService],
})
export class SourceConnectorModule {}
