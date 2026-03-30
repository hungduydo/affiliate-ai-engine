import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IPublisherAdapter, PublishPayload, PublishResult } from '../domain/adapters/publisher.adapter.interface';

interface ShopifyArticleResponse {
  article: {
    id: number;
    url: string;
    handle: string;
  };
}

@Injectable()
export class ShopifyAdapter implements IPublisherAdapter {
  readonly platform = 'SHOPIFY';
  private readonly logger = new Logger(ShopifyAdapter.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  isConfigured(): boolean {
    return !!(
      this.config.get('SHOPIFY_STORE_URL') &&
      this.config.get('SHOPIFY_ACCESS_TOKEN') &&
      this.config.get('SHOPIFY_BLOG_ID')
    );
  }

  async publish(payload: PublishPayload): Promise<PublishResult> {
    if (!this.isConfigured()) {
      return { success: false, errorMessage: 'Shopify credentials not configured' };
    }

    const storeUrl = this.config.getOrThrow<string>('SHOPIFY_STORE_URL').replace(/\/$/, '');
    const accessToken = this.config.getOrThrow<string>('SHOPIFY_ACCESS_TOKEN');
    const blogId = this.config.getOrThrow<string>('SHOPIFY_BLOG_ID');

    try {
      const response = await firstValueFrom(
        this.http.post<ShopifyArticleResponse>(
          `${storeUrl}/admin/api/2024-01/blogs/${blogId}/articles.json`,
          {
            article: {
              title: payload.title ?? '',
              body_html: payload.body,
              published: true,
            },
          },
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const article = response.data.article;
      // Build canonical URL: store URL + /blogs/{blog-handle}/{article-handle}
      const publishedLink = article.url ?? `${storeUrl}/blogs/news/${article.handle}`;
      this.logger.log(`Published to Shopify: ${publishedLink}`);
      return { success: true, publishedLink };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Shopify publish failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }
}
