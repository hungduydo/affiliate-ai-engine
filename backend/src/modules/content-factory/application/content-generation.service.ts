import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ContentPrismaService } from '../prisma/prisma.service';
import { GeminiAdapter } from '../infrastructure/gemini.adapter';
import { renderPrompt } from '@shared/utils/prompt-renderer';
import { ContentStatus } from '@prisma/client';

interface ProductData {
  id: string;
  name: string;
  description?: string;
  price?: number;
  commission?: number;
  affiliateLink: string;
  imageUrl?: string;
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
    private readonly gemini: GeminiAdapter,
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
        // Fallback: generic prompt based on platform + content type
        const tplRes = await firstValueFrom(
          this.http.get<{ data: PromptTemplateData[] }>(
            `${this.internalBase}/api/internal/prompts?platform=${content.platform}&contentType=${content.contentType}&isActive=true`,
          ),
        );
        const templates = tplRes.data?.data ?? [];
        if (templates.length > 0) {
          template = templates[0].template;
        } else {
          template = this.buildDefaultPrompt(content.platform, content.contentType as string);
        }
      }

      // 5. Render prompt with product variables
      const filledPrompt = renderPrompt(template, {
        name: product.name,
        description: product.description ?? '',
        price: product.price ?? '',
        commission: product.commission ?? '',
        affiliateLink: product.affiliateLink,
      });

      // 6. Generate via Gemini
      const generated = await this.gemini.generate(filledPrompt);

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
    return `Write a compelling ${contentType.toLowerCase().replace(/_/g, ' ')} for the ${platform} platform about the following product:

Product: {{name}}
Description: {{description}}
Price: {{price}}
Commission: {{commission}}%
Affiliate Link: {{affiliateLink}}

Include the affiliate link naturally in the content. Be persuasive and informative.`;
  }
}
