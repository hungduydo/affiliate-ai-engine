import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ContentPrismaService } from '../prisma/prisma.service';
import { AI_ADAPTER, AIAdapter, ProductDNA } from '@shared/ai/ai-adapter.interface';
import { renderPrompt } from '@shared/utils/prompt-renderer';
import { ContentStatus } from '@prisma-client/content-factory';

interface ProductData {
  id: string;
  name: string;
  description?: string;
  price?: number;
  commission?: number;
  affiliateLink: string;
  imageUrl?: string;
  productDna?: ProductDNA | null;
}

interface PromptTemplateData {
  id: string;
  template: string;
  name: string;
}

@Injectable()
export class ContentGenerationService {
  private readonly logger = new Logger(ContentGenerationService.name);
  private readonly internalBase: string;

  constructor(
    private readonly prisma: ContentPrismaService,
    @Inject(AI_ADAPTER) private readonly ai: AIAdapter,
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.internalBase = config.get<string>('BACKEND_INTERNAL_URL', 'http://localhost:3000');
  }

  async generate(contentId: string): Promise<void> {
    // 1. Load content row
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new Error(`Content ${contentId} not found`);

    // 2. Mark as processing
    await this.prisma.content.update({ where: { id: contentId }, data: { status: ContentStatus.AI_PROCESSING } });

    try {
      // 3. Fetch product via internal REST
      const productRes = await firstValueFrom(
        this.http.get<ProductData>(`${this.internalBase}/api/internal/products/${content.productId}`),
      );
      const product = productRes.data;

      // 4. Fetch prompt template
      let template: string;
      if (content.promptId) {
        const tplRes = await firstValueFrom(
          this.http.get<PromptTemplateData>(`${this.internalBase}/api/internal/prompts/${content.promptId}`),
        );
        template = tplRes.data.template;
      } else {
        const tplRes = await firstValueFrom(
          this.http.get<{ data: PromptTemplateData[] }>(
            `${this.internalBase}/api/internal/prompts?platform=${content.platform}&contentType=${content.contentType}&isActive=true`,
          ),
        );
        const templates = tplRes.data?.data ?? [];
        template = templates.length > 0
          ? templates[0].template
          : this.buildDefaultPrompt(content.platform, content.contentType as string);
      }

      // 5. Render prompt with product variables
      const filledPrompt = renderPrompt(template, {
        name: product.name,
        description: product.description ?? '',
        price: product.price ?? '',
        commission: product.commission ?? '',
        affiliateLink: product.affiliateLink,
      });

      // 6. Generate via AI — use DNA if available for richer context
      const generated = product.productDna
        ? await this.ai.generateWithDNA(filledPrompt, product.productDna)
        : await this.ai.generate(filledPrompt);

      // 7. Save result
      await this.prisma.content.update({
        where: { id: contentId },
        data: {
          title: generated.title,
          body: generated.body,
          status: ContentStatus.GENERATED,
        },
      });

      this.logger.log(`Content ${contentId} generated successfully`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Content ${contentId} generation failed: ${message}`, err);
      await this.prisma.content.update({
        where: { id: contentId },
        data: { status: ContentStatus.FAILED },
      });
      throw err;
    }
  }

  private buildDefaultPrompt(platform: string, contentType: string): string {
    const type = contentType.toLowerCase().replace(/_/g, ' ');

    if (contentType === 'CAROUSEL') {
      return `Write a 7-slide Instagram/Facebook carousel about this product. Use this exact structure:

**Slide 1 — Problem Headline:** A bold, attention-grabbing statement about the problem the product solves.
**Slide 2 — Micro-step 1:** First educational point about how the product improves life.
**Slide 3 — Micro-step 2:** Second educational point with a specific benefit.
**Slide 4 — Micro-step 3:** Third educational point with emotional resonance.
**Slide 5 — Micro-step 4:** Fourth point focusing on the transformation.
**Slide 6 — Social Proof:** A compelling review or trust statement with the affiliate link: {{affiliateLink}}
**Slide 7 — CTA:** "Save this for later" style call to action.

Product: {{name}}
Description: {{description}}
Price: {{price}} | Commission: {{commission}}%`;
    }

    if (contentType === 'THREAD') {
      return `Write a 5-post X (Twitter) authority thread about this product. Use this structure:

**Post 1 — Hot Take:** A contrarian or surprising statement about the product category to stop the scroll. (max 280 chars)
**Post 2 — Data Point 1:** First data-backed reason why this product is the 2026 standard. (max 280 chars)
**Post 3 — Data Point 2:** Second compelling evidence or benefit. (max 280 chars)
**Post 4 — Data Point 3:** Third reason with social proof angle. (max 280 chars)
**Post 5 — CTA:** Direct link with scarcity-based call to action. Include: {{affiliateLink}} (max 280 chars)

Product: {{name}}
Description: {{description}}`;
    }

    if (contentType === 'HERO_COPY') {
      return `Write website Hero section copy for this product. Include:

**H1:** A benefit-driven headline (under 10 words, no generic phrases like "game-changer").
**Sub-headline:** A 2-sentence explanation of the unique selling proposition.
**FAQ — Q1:** Most common customer question + answer.
**FAQ — Q2:** Objection-handling question + answer.
**FAQ — Q3:** Trust/credibility question + answer.

Include the affiliate link naturally in the sub-headline or FAQ: {{affiliateLink}}

Product: {{name}}
Description: {{description}}
Price: {{price}}`;
    }

    if (platform === 'TIKTOK' && contentType === 'VIDEO_SCRIPT') {
      return `Write a 45-second TikTok/Reels video script for this product. Use the high-retention structure:

**[HOOK — 0-3s]:** Start with the RESULT, not an intro. Pattern interrupt. (1-2 punchy sentences)
**[AGITATION — 3-10s]:** The problem the viewer faces right now. Make it relatable. [Visual cue]
**[MAGIC MOMENT DEMO — 10-35s]:** Show the product solving the problem. Include [Bracketed visual cues] for the editor. 3-4 beats.
**[SEARCH-OPTIMIZED CTA — 35-45s]:** "Search [keyword] to find this." Include {{affiliateLink}} in caption note.

Product: {{name}}
Description: {{description}}
Price: {{price}} | Commission: {{commission}}%`;
    }

    if (platform === 'FACEBOOK' && contentType === 'SOCIAL_POST') {
      return `Write a Facebook/Instagram caption using the TEA Framework for this product:

**TEACH:** One surprising fact or insight about the problem this product solves.
**EXPLAIN:** How {{name}} addresses it in a practical, relatable way.
**APPLY:** What the reader should do right now (include {{affiliateLink}}).

End with a "Related Searches" SEO block:
🔍 Related: [5 high-intent keywords for this product category]

Tone: conversational, no generic marketing phrases.
Price: {{price}} | Commission: {{commission}}%
Description: {{description}}`;
    }

    // Generic fallback
    return `Write a compelling ${type} for the ${platform} platform about the following product:

Product: {{name}}
Description: {{description}}
Price: {{price}}
Commission: {{commission}}%
Affiliate Link: {{affiliateLink}}

Include the affiliate link naturally in the content. Be persuasive and platform-native.`;
  }
}
