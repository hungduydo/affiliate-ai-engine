import { Injectable, Module, OnApplicationBootstrap } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PublishPrismaService } from './prisma/prisma.service';
import { PublishingController } from './presentation/publishing.controller';
import { PublishingInternalController } from './presentation/publishing.internal.controller';
import { PublishingService } from './application/publishing.service';
import { PublishContentService } from './application/publish-content.service';
import { WordPressAdapter } from './infrastructure/wordpress.adapter';
import { FacebookAdapter } from './infrastructure/facebook.adapter';
import { ShopifyAdapter } from './infrastructure/shopify.adapter';
import { BufferAdapter } from './infrastructure/buffer.adapter';
import { PublishContentProcessor } from './processors/publish-content.processor';
import { QueueEngineModule } from '../queue-engine/queue-engine.module';

@Injectable()
class DistributionBootstrap implements OnApplicationBootstrap {
  constructor(private readonly processor: PublishContentProcessor) {}
  onApplicationBootstrap() {
    this.processor.start();
  }
}

@Module({
  imports: [HttpModule, QueueEngineModule],
  controllers: [PublishingController, PublishingInternalController],
  providers: [
    PublishPrismaService,
    {
      provide: 'PublishPrismaService',
      useExisting: PublishPrismaService,
    },
    PublishingService,
    WordPressAdapter,
    FacebookAdapter,
    ShopifyAdapter,
    BufferAdapter,
    PublishContentService,
    PublishContentProcessor,
    DistributionBootstrap,
  ],
  exports: [PublishPrismaService, PublishingService, 'PublishPrismaService', WordPressAdapter, FacebookAdapter],
})
export class DistributionHubModule {}
