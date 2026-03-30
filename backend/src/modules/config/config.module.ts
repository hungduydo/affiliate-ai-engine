import { Module } from '@nestjs/common';
import { ConfigPrismaService } from './prisma/prisma.service';
import { PromptTemplatesService } from './application/prompt-templates.service';
import { ConfigController } from './presentation/config.controller';
import { ConfigInternalController } from './presentation/config.internal.controller';

@Module({
  providers: [ConfigPrismaService, PromptTemplatesService],
  controllers: [ConfigController, ConfigInternalController],
  exports: [ConfigPrismaService, PromptTemplatesService],
})
export class ConfigModule {}
