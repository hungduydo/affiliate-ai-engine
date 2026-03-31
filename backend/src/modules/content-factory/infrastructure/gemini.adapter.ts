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
    const fullPrompt = `
  You are an expert content writer, your target is write title/description for product below
    ${prompt}

Respond MUST a valid JSON object in this exact format (no markdown, no explanation):
{"title":"<content title here>","body":"<full content body here>"}`;
    this.logger.log(fullPrompt)
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        // Force JSON output to prevent parsing errors
        responseMimeType: "application/json"
      }
    });
    const text = result.response.text().trim();

    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

      // Try direct parse first
      let parsed: { title?: string; body?: string } | null = null;
      try {
        parsed = JSON.parse(cleaned) as { title?: string; body?: string };
      } catch {
        // Gemini sometimes emits literal newlines inside JSON strings — extract with regex
        const titleMatch = cleaned.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        const bodyMatch = cleaned.match(/"body"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        if (titleMatch || bodyMatch) {
          const unescape = (s: string) => s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          parsed = {
            title: titleMatch ? unescape(titleMatch[1]) : undefined,
            body: bodyMatch ? unescape(bodyMatch[1]) : undefined,
          };
        }
      }

      if (parsed) {
        return {
          title: parsed.title ?? cleaned.slice(0, 120),
          body: parsed.body ?? cleaned,
        };
      }

      this.logger.warn(`Gemini response was not valid JSON — using raw text as body`);
      return {
        title: cleaned.slice(0, 120).replace(/\n/g, ' '),
        body: cleaned,
      };
    } catch {
      this.logger.warn(`Gemini response parsing failed — using raw text as body`);
      return {
        title: text.slice(0, 120).replace(/\n/g, ' '),
        body: text,
      };
    }
  }
}
