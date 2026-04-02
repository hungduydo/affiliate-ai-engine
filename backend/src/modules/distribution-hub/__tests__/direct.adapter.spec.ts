import { DirectAdapter } from '../infrastructure/direct.adapter';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { createPublishPayloadFixture } from './fixtures/publishing.fixtures';

describe('DirectAdapter', () => {
  let adapter: DirectAdapter;
  let http: jest.Mocked<HttpService>;

  beforeEach(() => {
    http = { post: jest.fn() } as unknown as jest.Mocked<HttpService>;
    adapter = new DirectAdapter(http);
  });

  // ---------------------------------------------------------------------------
  // isConfigured()
  // ---------------------------------------------------------------------------

  describe('isConfigured()', () => {
    it('should return true when WordPress credentials are complete', () => {
      expect(
        adapter.isConfigured({
          wordpressUrl: 'https://blog.com',
          wordpressUsername: 'admin',
          wordpressAppPassword: 'xxxx xxxx',
        }),
      ).toBe(true);
    });

    it('should return true when Shopify credentials are complete', () => {
      expect(
        adapter.isConfigured({
          shopifyStoreUrl: 'https://store.myshopify.com',
          shopifyAccessToken: 'shpat_abc',
          shopifyBlogId: '123',
        }),
      ).toBe(true);
    });

    it('should return true when Facebook credentials are complete', () => {
      expect(
        adapter.isConfigured({
          facebookPageId: 'page-123',
          facebookAccessToken: 'EAAabc',
        }),
      ).toBe(true);
    });

    it('should return false when no credentials are provided', () => {
      expect(adapter.isConfigured({})).toBe(false);
    });

    it('should return false when WordPress credentials are partial', () => {
      expect(
        adapter.isConfigured({
          wordpressUrl: 'https://blog.com',
          // missing username and password
        }),
      ).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // publish() — unsupported platform
  // ---------------------------------------------------------------------------

  describe('publish() — unknown platform', () => {
    it('should return error for unsupported platform', async () => {
      const result = await adapter.publish(createPublishPayloadFixture(), 'TIKTOK', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('TIKTOK');
    });
  });

  // ---------------------------------------------------------------------------
  // WordPress
  // ---------------------------------------------------------------------------

  describe('publish() — WORDPRESS', () => {
    const wordpressCreds = {
      wordpressUrl: 'https://myblog.com',
      wordpressUsername: 'admin',
      wordpressAppPassword: 'pass word',
    };

    it('should publish successfully and return the post link', async () => {
      http.post.mockReturnValue(
        of({ data: { id: 42, link: 'https://myblog.com/new-post' } } as any),
      );

      const result = await adapter.publish(createPublishPayloadFixture(), 'WORDPRESS', wordpressCreds);
      expect(result.success).toBe(true);
      expect(result.publishedLink).toBe('https://myblog.com/new-post');
    });

    it('should use Basic auth header with base64-encoded credentials', async () => {
      http.post.mockReturnValue(
        of({ data: { id: 1, link: 'https://myblog.com/post' } } as any),
      );

      await adapter.publish(createPublishPayloadFixture(), 'WORDPRESS', wordpressCreds);

      const headers = http.post.mock.calls[0][2]?.headers as Record<string, string>;
      const expectedToken = Buffer.from('admin:pass word').toString('base64');
      expect(headers.Authorization).toBe(`Basic ${expectedToken}`);
    });

    it('should send title and body in the request body', async () => {
      const payload = createPublishPayloadFixture({ title: 'My Title', body: 'My body' });
      http.post.mockReturnValue(
        of({ data: { id: 1, link: 'https://myblog.com/post' } } as any),
      );

      await adapter.publish(payload, 'WORDPRESS', wordpressCreds);

      const postBody = http.post.mock.calls[0][1] as any;
      expect(postBody.title).toBe('My Title');
      expect(postBody.content).toBe('My body');
      expect(postBody.status).toBe('publish');
    });

    it('should return error when WordPress credentials are missing', async () => {
      const result = await adapter.publish(createPublishPayloadFixture(), 'WORDPRESS', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('WordPress credentials not configured');
    });

    it('should return error when HTTP call fails', async () => {
      http.post.mockReturnValue(throwError(() => new Error('Connection refused')));

      const result = await adapter.publish(createPublishPayloadFixture(), 'WORDPRESS', wordpressCreds);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Connection refused');
    });

    it('should strip trailing slash from URL', async () => {
      const credsWithSlash = { ...wordpressCreds, wordpressUrl: 'https://myblog.com/' };
      http.post.mockReturnValue(
        of({ data: { id: 1, link: 'https://myblog.com/post' } } as any),
      );

      await adapter.publish(createPublishPayloadFixture(), 'WORDPRESS', credsWithSlash);

      const url = http.post.mock.calls[0][0] as string;
      expect(url).toBe('https://myblog.com/wp-json/wp/v2/posts');
    });
  });

  // ---------------------------------------------------------------------------
  // Shopify
  // ---------------------------------------------------------------------------

  describe('publish() — SHOPIFY', () => {
    const shopifyCreds = {
      shopifyStoreUrl: 'https://mystore.myshopify.com',
      shopifyAccessToken: 'shpat_xyz',
      shopifyBlogId: '99887766',
    };

    it('should publish successfully and return the article URL', async () => {
      http.post.mockReturnValue(
        of({
          data: {
            article: {
              id: 555,
              url: 'https://mystore.myshopify.com/blogs/news/my-article',
              handle: 'my-article',
            },
          },
        } as any),
      );

      const result = await adapter.publish(createPublishPayloadFixture(), 'SHOPIFY', shopifyCreds);
      expect(result.success).toBe(true);
      expect(result.publishedLink).toBe('https://mystore.myshopify.com/blogs/news/my-article');
    });

    it('should use X-Shopify-Access-Token header', async () => {
      http.post.mockReturnValue(
        of({ data: { article: { id: 1, url: 'https://store.com/article', handle: 'article' } } } as any),
      );

      await adapter.publish(createPublishPayloadFixture(), 'SHOPIFY', shopifyCreds);

      const headers = http.post.mock.calls[0][2]?.headers as Record<string, string>;
      expect(headers['X-Shopify-Access-Token']).toBe('shpat_xyz');
    });

    it('should include blogId in the URL', async () => {
      http.post.mockReturnValue(
        of({ data: { article: { id: 1, url: 'https://store.com/article', handle: 'article' } } } as any),
      );

      await adapter.publish(createPublishPayloadFixture(), 'SHOPIFY', shopifyCreds);

      const url = http.post.mock.calls[0][0] as string;
      expect(url).toContain('99887766');
    });

    it('should return error when Shopify credentials are missing', async () => {
      const result = await adapter.publish(createPublishPayloadFixture(), 'SHOPIFY', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Shopify credentials not configured');
    });

    it('should return error when HTTP call fails', async () => {
      http.post.mockReturnValue(throwError(() => new Error('Shopify API error')));

      const result = await adapter.publish(createPublishPayloadFixture(), 'SHOPIFY', shopifyCreds);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Shopify API error');
    });
  });

  // ---------------------------------------------------------------------------
  // Facebook
  // ---------------------------------------------------------------------------

  describe('publish() — FACEBOOK', () => {
    const facebookCreds = {
      facebookPageId: 'page-111',
      facebookAccessToken: 'EAAtest',
    };

    it('should publish successfully and return a Facebook post link', async () => {
      http.post.mockReturnValue(
        of({ data: { id: 'page-111_post-222' } } as any),
      );

      const result = await adapter.publish(createPublishPayloadFixture(), 'FACEBOOK', facebookCreds);
      expect(result.success).toBe(true);
      expect(result.publishedLink).toContain('facebook.com');
    });

    it('should send message (body) in the request body', async () => {
      const payload = createPublishPayloadFixture({ body: 'Hello Facebook!' });
      http.post.mockReturnValue(of({ data: { id: 'page-111_post-333' } } as any));

      await adapter.publish(payload, 'FACEBOOK', facebookCreds);

      const postBody = http.post.mock.calls[0][1] as any;
      expect(postBody.message).toBe('Hello Facebook!');
    });

    it('should pass access_token as a query param', async () => {
      http.post.mockReturnValue(of({ data: { id: 'page-111_post-444' } } as any));

      await adapter.publish(createPublishPayloadFixture(), 'FACEBOOK', facebookCreds);

      const config = http.post.mock.calls[0][2] as any;
      expect(config.params.access_token).toBe('EAAtest');
    });

    it('should return error when Facebook credentials are missing', async () => {
      const result = await adapter.publish(createPublishPayloadFixture(), 'FACEBOOK', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Facebook credentials not configured');
    });

    it('should return error when HTTP call fails', async () => {
      http.post.mockReturnValue(throwError(() => new Error('Graph API error')));

      const result = await adapter.publish(createPublishPayloadFixture(), 'FACEBOOK', facebookCreds);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Graph API error');
    });

    it('should include imageUrl as link when provided', async () => {
      const payload = createPublishPayloadFixture({ imageUrl: 'https://img.com/photo.jpg' });
      http.post.mockReturnValue(of({ data: { id: 'page-111_post-555' } } as any));

      await adapter.publish(payload, 'FACEBOOK', facebookCreds);

      const postBody = http.post.mock.calls[0][1] as any;
      expect(postBody.link).toBe('https://img.com/photo.jpg');
    });
  });
});
