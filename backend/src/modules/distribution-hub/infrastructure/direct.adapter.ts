import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
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
 *   FACEBOOK  → flow-accounts internal API (encrypted tokens, audit log)
 */
@Injectable()
export class DirectAdapter implements IPublisherAdapter {
  readonly providerKey = 'DIRECT';
  private readonly logger = new Logger(DirectAdapter.name);
  private readonly flowAccountsUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.flowAccountsUrl = config.get<string>('FLOW_ACCOUNTS_URL', 'http://localhost:4000');
  }

  isConfigured(credentials: ProviderCredentials): boolean {
    const hasWordPress =
      !!(credentials.wordpressUrl && credentials.wordpressUsername && credentials.wordpressAppPassword);
    const hasShopify =
      !!(credentials.shopifyStoreUrl && credentials.shopifyAccessToken && credentials.shopifyBlogId);
    const hasFacebook = !!credentials.facebookPageId;
    return hasWordPress || hasShopify || hasFacebook;
  }

  async publish(payload: PublishPayload, platform: string, credentials: ProviderCredentials): Promise<PublishResult> {
    switch (platform.toUpperCase()) {
      case 'WORDPRESS':
        return this.publishWordPress(payload, credentials);
      case 'SHOPIFY':
        return this.publishShopify(payload, credentials);
      case 'FACEBOOK':
        return this.publishViaFlowAccounts('facebook', payload, credentials);
      case 'INSTAGRAM':
        return this.publishViaFlowAccounts('instagram', payload, credentials);
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
  // Facebook / Instagram — delegated to flow-accounts (encrypted tokens, audit)
  // ---------------------------------------------------------------------------

  private async publishViaFlowAccounts(
    platform: 'facebook' | 'instagram',
    payload: PublishPayload,
    credentials: ProviderCredentials,
  ): Promise<PublishResult> {
    const pageId = credentials.facebookPageId;
    if (!pageId) {
      return { success: false, errorMessage: `${platform} pageId not configured in provider credentials` };
    }

    const imageUrls = payload.assets?.filter((a) => a.type === 'image').map((a) => a.url)
      ?? (payload.imageUrl ? [payload.imageUrl] : []);
    const hasVideo = payload.assets?.some((a) => a.type === 'video') ?? false;
    const mediaType = hasVideo ? 'video' : imageUrls.length > 0 ? 'photo' : 'text';

    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; platformPostId: string; publishedLink: string }>(
          `${this.flowAccountsUrl}/api/internal/publish`,
          { platform, pageId, caption: payload.body, mediaUrls: imageUrls, mediaType },
        ),
      );

      this.logger.log(`Published to ${platform} via flow-accounts: ${response.data.publishedLink}`);
      return { success: true, publishedLink: response.data.publishedLink };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`${platform} publish via flow-accounts failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }
}
