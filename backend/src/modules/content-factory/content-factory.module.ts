import { Injectable, Module, OnApplicationBootstrap } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ContentPrismaService } from './prisma/prisma.service';
import { ContentController } from './presentation/content.controller';
import { ContentInternalController } from './presentation/content.internal.controller';
import { ContentService } from './application/content.service';
import { ContentGenerationService } from './application/content-generation.service';
import { ContentGenerationProcessor } from './processors/content-generation.processor';
import { QueueEngineModule } from '../queue-engine/queue-engine.module';

@Injectable()
class ContentFactoryBootstrap implements OnApplicationBootstrap {
  constructor(private readonly processor: ContentGenerationProcessor) {}
  onApplicationBootstrap() {
    this.processor.start();
  }
}

@Module({
  imports: [HttpModule, QueueEngineModule],
  controllers: [ContentController, ContentInternalController],
  providers: [
    ContentPrismaService,
    {
      provide: 'ContentPrismaService',
      useExisting: ContentPrismaService,
    },
    ContentService,
    ContentGenerationService,
    ContentGenerationProcessor,
    ContentFactoryBootstrap,
  ],
  exports: [ContentPrismaService, ContentService, 'ContentPrismaService'],
})
export class ContentFactoryModule {}
