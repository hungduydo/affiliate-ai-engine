import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import type { AIAdapter, GeneratedContent, ProductDNA, ProductInput } from './ai-adapter.interface';

const SYSTEM_INSTRUCTION = `You are an expert Content Architect. Convert technical product specifications into persuasive, platform-native narratives. Prioritize 'Hook Rate' for video scripts, 'Dwell Time' for carousels, and 'Search Intent' for captions. Output clean Markdown. Use emojis strategically in social copy only.`;

@Injectable()
export class OllamaAdapter implements AIAdapter {
  private readonly logger = new Logger(OllamaAdapter.name);
  private readonly client: Ollama;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('OLLAMA_API_KEY');
    const host = this.config.get<string>('OLLAMA_HOST', 'https://ollama.com');

    this.client = new Ollama({
      host,
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    this.modelName = this.config.get<string>('OLLAMA_MODEL', 'gemma4:31b');
    this.logger.log(`Initialized Ollama adapter with model: ${this.modelName}`);
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

    try {
      this.logger.debug(`Extracting DNA for product: ${product.name}`);
      const response = await this.client.chat({
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      });

      const text = response.message.content.trim();
      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const raw = JSON.parse(cleaned) as Record<string, unknown>;

      const persona = (raw.targetPersona ?? {}) as Record<string, unknown>;
      const dna: ProductDNA = {
        coreProblem: raw.coreProblem as string,
        keyFeatures: (raw.keyFeatures ?? []) as ProductDNA['keyFeatures'],
        targetPersona: {
          demographics: persona.demographics as string,
          psychographics: persona.psychographics as string,
        },
        objectionHandling: (
          raw.objectionHandling ?? persona.objectionHandling ?? []
        ) as ProductDNA['objectionHandling'],
        visualAnchors: (raw.visualAnchors ?? persona.visualAnchors ?? []) as string[],
      };

      this.logger.debug(`Successfully extracted DNA for: ${product.name}`);
      return dna;
    } catch (error) {
      this.logger.error(`Failed to extract DNA for ${product.name}:`, error);
      throw new Error(`DNA extraction failed: ${error instanceof Error ? error.message : String(error)}`);
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

    try {
      this.logger.log(`Generating content via Ollama, prompt length: ${fullPrompt.length}`);
      const response = await this.client.chat({
        model: this.modelName,
        messages: [{ role: 'user', content: fullPrompt }],
        stream: false,
      });

      const text = response.message.content.trim();
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

      this.logger.warn('Ollama response was not valid JSON — using raw text as body');
      return {
        title: cleaned.slice(0, 120).replace(/\n/g, ' '),
        body: cleaned,
      };
    } catch (error) {
      this.logger.error('Ollama generation failed:', error);
      throw new Error(`Content generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
