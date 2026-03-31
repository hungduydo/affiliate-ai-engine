import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { ProductManagementModule } from './modules/product-management/product-management.module';
import { ContentFactoryModule } from './modules/content-factory/content-factory.module';
import { DistributionHubModule } from './modules/distribution-hub/distribution-hub.module';
import { QueueEngineModule } from './modules/queue-engine/queue-engine.module';
import { SourceConnectorModule } from './modules/source-connector/source-connector.module';
import { ConfigModule as ConfigModuleLocal } from './modules/config/config.module';
import { AiModule } from './shared/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
    }),
    AiModule,
    QueueEngineModule,
    ConfigModuleLocal,
    ProductManagementModule,
    ContentFactoryModule,
    DistributionHubModule,
    SourceConnectorModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
