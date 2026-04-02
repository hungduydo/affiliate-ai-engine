import { Module } from '@nestjs/common';
import { ConfigPrismaService } from './prisma/prisma.service';
import { PromptTemplatesService } from './application/prompt-templates.service';
import { PublishProviderService } from './application/publish-provider.service';
import { ConfigController } from './presentation/config.controller';
import { ConfigInternalController } from './presentation/config.internal.controller';

@Module({
  providers: [
    ConfigPrismaService,
    { provide: 'ConfigPrismaService', useExisting: ConfigPrismaService },
    PromptTemplatesService,
    PublishProviderService,
  ],
  controllers: [ConfigController, ConfigInternalController],
  exports: [ConfigPrismaService, PromptTemplatesService, PublishProviderService, 'ConfigPrismaService'],
})
export class ConfigModule {}
