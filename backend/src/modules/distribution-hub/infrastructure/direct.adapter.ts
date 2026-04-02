import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  IPublisherAdapter,
  ProviderCredentials,
  PublishPayload,
  PublishResult,
} from '../domain/adapters/publisher.adapter.interface';

interface ShopifyArticleResponse {
  article: { id: number; url: string; handle: string };
}

/**
 * DIRECT provider — publishes straight to the platform's own API.
 * No 3rd-party intermediary. Routes internally by platform:
 *   WORDPRESS → WordPress REST API (Basic auth)
 *   SHOPIFY   → Shopify REST API
 *   FACEBOOK  → Facebook Graph API
 */
@Injectable()
export class DirectAdapter implements IPublisherAdapter {
  readonly providerKey = 'DIRECT';
  private readonly logger = new Logger(DirectAdapter.name);

  constructor(private readonly http: HttpService) {}

  isConfigured(credentials: ProviderCredentials): boolean {
    // At least one platform's credentials must be present
    const hasWordPress =
      !!(credentials.wordpressUrl && credentials.wordpressUsername && credentials.wordpressAppPassword);
    const hasShopify =
      !!(credentials.shopifyStoreUrl && credentials.shopifyAccessToken && credentials.shopifyBlogId);
    const hasFacebook =
      !!(credentials.facebookPageId && credentials.facebookAccessToken);
    return hasWordPress || hasShopify || hasFacebook;
  }

  async publish(payload: PublishPayload, platform: string, credentials: ProviderCredentials): Promise<PublishResult> {
    switch (platform.toUpperCase()) {
      case 'WORDPRESS':
        return this.publishWordPress(payload, credentials);
      case 'SHOPIFY':
        return this.publishShopify(payload, credentials);
      case 'FACEBOOK':
        return this.publishFacebook(payload, credentials);
      default:
        return { success: false, errorMessage: `Direct adapter does not support platform: ${platform}` };
    }
  }

  // ---------------------------------------------------------------------------
  // WordPress
  // ---------------------------------------------------------------------------

  private async publishWordPress(payload: PublishPayload, credentials: ProviderCredentials): Promise<PublishResult> {
    const { wordpressUrl, wordpressUsername, wordpressAppPassword } = credentials;

    if (!wordpressUrl || !wordpressUsername || !wordpressAppPassword) {
      return { success: false, errorMessage: 'WordPress credentials not configured (wordpressUrl, wordpressUsername, wordpressAppPassword required)' };
    }

    const basicAuth = Buffer.from(`${wordpressUsername}:${wordpressAppPassword}`).toString('base64');

    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number; link: string }>(
          `${wordpressUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`,
          {
            title: payload.title ?? '',
            content: payload.body,
            status: 'publish',
            ...(payload.tags?.length ? { tags: payload.tags } : {}),
          },
          {
            headers: {
              Authorization: `Basic ${basicAuth}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Published to WordPress: ${response.data.link}`);
      return { success: true, publishedLink: response.data.link };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`WordPress publish failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }

  // ---------------------------------------------------------------------------
  // Shopify
  // ---------------------------------------------------------------------------

  private async publishShopify(payload: PublishPayload, credentials: ProviderCredentials): Promise<PublishResult> {
    const { shopifyStoreUrl, shopifyAccessToken, shopifyBlogId } = credentials;

    if (!shopifyStoreUrl || !shopifyAccessToken || !shopifyBlogId) {
      return { success: false, errorMessage: 'Shopify credentials not configured (shopifyStoreUrl, shopifyAccessToken, shopifyBlogId required)' };
    }

    const storeUrl = shopifyStoreUrl.replace(/\/$/, '');

    try {
      const response = await firstValueFrom(
        this.http.post<ShopifyArticleResponse>(
          `${storeUrl}/admin/api/2024-01/blogs/${shopifyBlogId}/articles.json`,
          {
            article: {
              title: payload.title ?? '',
              body_html: payload.body,
              published: true,
            },
          },
          {
            headers: {
              'X-Shopify-Access-Token': shopifyAccessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const article = response.data.article;
      const publishedLink = article.url ?? `${storeUrl}/blogs/news/${article.handle}`;
      this.logger.log(`Published to Shopify: ${publishedLink}`);
      return { success: true, publishedLink };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Shopify publish failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }

  // ---------------------------------------------------------------------------
  // Facebook
  // ---------------------------------------------------------------------------

  private async publishFacebook(payload: PublishPayload, credentials: ProviderCredentials): Promise<PublishResult> {
    const { facebookPageId, facebookAccessToken } = credentials;

    if (!facebookPageId || !facebookAccessToken) {
      return { success: false, errorMessage: 'Facebook credentials not configured (facebookPageId, facebookAccessToken required)' };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ id: string }>(
          `https://graph.facebook.com/v19.0/${facebookPageId}/feed`,
          {
            message: payload.body,
            ...(payload.imageUrl ? { link: payload.imageUrl } : {}),
          },
          {
            params: { access_token: facebookAccessToken },
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const postId = response.data.id;
      const publishedLink = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;
      this.logger.log(`Published to Facebook: ${publishedLink}`);
      return { success: true, publishedLink };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Facebook publish failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }
}
