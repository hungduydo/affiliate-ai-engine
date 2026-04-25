import { Module } from '@nestjs/common';
import { ConfigPrismaService } from './prisma/prisma.service';
import { PromptTemplatesService } from './application/prompt-templates.service';
import { PublishProviderService } from './application/publish-provider.service';
import { DiscoveryCacheService } from './application/discovery-cache.service';
import { ConfigController } from './presentation/config.controller';
import { ConfigInternalController } from './presentation/config.internal.controller';

@Module({
  providers: [
    ConfigPrismaService,
    { provide: 'ConfigPrismaService', useExisting: ConfigPrismaService },
    PromptTemplatesService,
    PublishProviderService,
    DiscoveryCacheService,
  ],
  controllers: [ConfigController, ConfigInternalController],
  exports: [ConfigPrismaService, PromptTemplatesService, PublishProviderService, DiscoveryCacheService, 'ConfigPrismaService'],
})
export class ConfigModule {}
