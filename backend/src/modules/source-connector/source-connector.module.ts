import { Injectable, Module, OnApplicationBootstrap } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClickBankAdapter } from './infrastructure/adapters/clickbank/clickbank.adapter';
import { CJAdapter } from './infrastructure/adapters/cj/cj.adapter';
import { ShopeePlaywrightAdapter } from './infrastructure/adapters/shopee/shopee.playwright.adapter';
import { CsvImporter } from './infrastructure/csv/csv.importer';
import { ProductIngestionService } from './application/product-ingestion.service';
import { ProductScraperProcessor } from '../queue-engine/processors/product-scraper.processor';
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

@Module({
  imports: [HttpModule, QueueEngineModule],
  providers: [
    ClickBankAdapter,
    CJAdapter,
    ShopeePlaywrightAdapter,
    CsvImporter,
    ProductIngestionService,
    ProductScraperProcessor,
    SourceConnectorBootstrap,
  ],
  controllers: [SourceController, CsvController],
  exports: [ProductIngestionService],
})
export class SourceConnectorModule {}
