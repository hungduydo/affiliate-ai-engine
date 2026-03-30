import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeneratedContent {
  title: string;
  body: string;
}

@Injectable()
export class GeminiAdapter {
  private readonly logger = new Logger(GeminiAdapter.name);
  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('GOOGLE_API_KEY');
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = this.config.get<string>('GEMINI_MODEL', 'gemini-1.5-pro');
  }

  async generate(prompt: string): Promise<GeneratedContent> {
    const fullPrompt = `${prompt}

Respond with ONLY a valid JSON object in this exact format (no markdown, no explanation):
{"title":"<content title here>","body":"<full content body here>"}`;

    const model = this.client.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text().trim();

    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleaned) as { title?: string; body?: string };
      return {
        title: parsed.title ?? text.slice(0, 120),
        body: parsed.body ?? text,
      };
    } catch {
      this.logger.warn(`Gemini response was not valid JSON — using raw text as body`);
      return {
        title: text.slice(0, 120).replace(/\n/g, ' '),
        body: text,
      };
    }
  }
}
