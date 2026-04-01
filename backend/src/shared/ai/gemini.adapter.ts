import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIAdapter, GeneratedContent, ProductDNA, ProductInput } from './ai-adapter.interface';

const SYSTEM_INSTRUCTION = `You are an expert Content Architect. Convert technical product specifications into persuasive, platform-native narratives. Prioritize 'Hook Rate' for video scripts, 'Dwell Time' for carousels, and 'Search Intent' for captions. Output clean Markdown. Use emojis strategically in social copy only.`;

@Injectable()
export class GeminiAdapter implements AIAdapter {
  private readonly logger = new Logger(GeminiAdapter.name);
  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('GOOGLE_API_KEY');
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = this.config.get<string>('GEMINI_MODEL', 'gemini-1.5-pro');
  }

  async extractProductDNA(product: ProductInput): Promise<ProductDNA> {
    const prompt = `Act as a Senior E-commerce Analyst. Extract the 'Product DNA' as structured JSON.

Product:
Name: ${product.name}
Description: ${product.description ?? 'N/A'}
Price: ${product.price ?? 'N/A'}
Commission: ${product.commission ?? 'N/A'}%
Affiliate Link: ${product.affiliateLink}

Output ONLY valid JSON matching this exact structure:
{"coreProblem":"<the #1 problem this product solves>","keyFeatures":[{"feature":"<feature name>","emotionalBenefit":"<emotional benefit>"},{"feature":"<feature name>","emotionalBenefit":"<emotional benefit>"},{"feature":"<feature name>","emotionalBenefit":"<emotional benefit>"}],"targetPersona":{"demographics":"<age, gender, income, location>","psychographics":"<values, lifestyle, pain points>"},"objectionHandling":[{"objection":"<reason someone wouldn't buy>","counter":"<how to address it>"},{"objection":"<reason>","counter":"<counter>"},{"objection":"<reason>","counter":"<counter>"}],"visualAnchors":["<visual element 1>","<visual element 2>","<visual element 3>","<visual element 4>","<visual element 5>"]}`;

    const model = this.client.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const text = result.response.text().trim();

    try {
      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleaned) as ProductDNA;
      return parsed;
    } catch {
      this.logger.error('Failed to parse Product DNA response', text);
      throw new Error('AI returned invalid JSON for Product DNA extraction');
    }
  }

  async generateWithDNA(prompt: string, dna: ProductDNA): Promise<GeneratedContent> {
    const dnaContext = `## Product DNA (use this to craft platform-native content)
- Core Problem Solved: ${dna.coreProblem}
- Key Features: ${dna.keyFeatures.map(f => `${f.feature} → ${f.emotionalBenefit}`).join('; ')}
- Target Persona: ${dna.targetPersona.demographics} | ${dna.targetPersona.psychographics}
- Objection Counters: ${dna.objectionHandling.map(o => `"${o.objection}" → ${o.counter}`).join('; ')}
- Visual Anchors: ${dna.visualAnchors.join(', ')}

`;
    return this.generate(dnaContext + prompt);
  }

  async generate(prompt: string): Promise<GeneratedContent> {
    const fullPrompt = `${SYSTEM_INSTRUCTION}

${prompt}

Respond with a valid JSON object in this exact format (no markdown, no explanation):
{"title":"<content title here>","body":"<full content body here>"}`;

    this.logger.log(`Generating content, prompt length: ${fullPrompt.length}`);
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const text = result.response.text().trim();

    try {
      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

      let parsed: { title?: string; body?: string } | null = null;
      try {
        parsed = JSON.parse(cleaned) as { title?: string; body?: string };
      } catch {
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

      this.logger.warn('Gemini response was not valid JSON — using raw text as body');
      return {
        title: cleaned.slice(0, 120).replace(/\n/g, ' '),
        body: cleaned,
      };
    } catch {
      this.logger.warn('Gemini response parsing failed — using raw text as body');
      return {
        title: text.slice(0, 120).replace(/\n/g, ' '),
        body: text,
      };
    }
  }
}
