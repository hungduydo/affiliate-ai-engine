import { Global, Module } from '@nestjs/common';
import { OllamaAdapter } from './ollama.adapter';
import { AI_ADAPTER } from './ai-adapter.interface';

@Global()
@Module({
  providers: [{ provide: AI_ADAPTER, useClass: OllamaAdapter }],
  exports: [AI_ADAPTER],
})
export class AiModule {}
