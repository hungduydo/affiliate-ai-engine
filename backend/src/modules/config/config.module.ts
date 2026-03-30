import { Module } from '@nestjs/common';
import { ConfigPrismaService } from './prisma/prisma.service';
import { PromptTemplatesService } from './application/prompt-templates.service';
import { ConfigController } from './presentation/config.controller';
import { ConfigInternalController } from './presentation/config.internal.controller';

@Module({
  providers: [
    ConfigPrismaService,
    { provide: 'ConfigPrismaService', useExisting: ConfigPrismaService },
    PromptTemplatesService,
  ],
  controllers: [ConfigController, ConfigInternalController],
  exports: [ConfigPrismaService, PromptTemplatesService, 'ConfigPrismaService'],
})
export class ConfigModule {}
