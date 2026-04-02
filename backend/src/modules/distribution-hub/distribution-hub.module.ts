import { Injectable, Module, OnApplicationBootstrap } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PublishPrismaService } from './prisma/prisma.service';
import { PublishingController } from './presentation/publishing.controller';
import { PublishingInternalController } from './presentation/publishing.internal.controller';
import { PublishingService } from './application/publishing.service';
import { PublishContentService } from './application/publish-content.service';
import { AdapterFactory } from './application/adapter-factory.service';
import { BufferAdapter } from './infrastructure/buffer.adapter';
import { DirectAdapter } from './infrastructure/direct.adapter';
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
    { provide: 'PublishPrismaService', useExisting: PublishPrismaService },
    PublishingService,
    BufferAdapter,
    DirectAdapter,
    AdapterFactory,
    PublishContentService,
    PublishContentProcessor,
    DistributionBootstrap,
  ],
  exports: [PublishPrismaService, PublishingService, 'PublishPrismaService'],
})
export class DistributionHubModule {}
