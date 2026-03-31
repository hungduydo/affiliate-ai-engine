import { Global, Module } from '@nestjs/common';
import { GeminiAdapter } from './gemini.adapter';
import { AI_ADAPTER } from './ai-adapter.interface';

@Global()
@Module({
  providers: [{ provide: AI_ADAPTER, useClass: GeminiAdapter }],
  exports: [AI_ADAPTER],
})
export class AiModule {}
