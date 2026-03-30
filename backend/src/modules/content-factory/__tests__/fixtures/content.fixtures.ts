import { ContentStatus, Platform, ContentType } from '@prisma/client';

export const createContentFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'content-123',
  productId: 'prod-123',
  platform: Platform.WORDPRESS as Platform,
  contentType: ContentType.BLOG_POST as ContentType,
  title: null,
  body: '',
  promptId: null,
  status: ContentStatus.RAW as ContentStatus,
  mediaAssets: null,
  createdAt: new Date('2026-03-30T10:00:00Z'),
  updatedAt: new Date('2026-03-30T10:00:00Z'),
  ...overrides,
});

export const createProductFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'prod-123',
  externalId: 'ext-prod-123',
  source: 'CLICKBANK',
  name: 'Test Product',
  description: 'A great test product for affiliate marketing',
  price: 29.99,
  commission: 10,
  affiliateLink: 'https://example.com/aff?ref=test',
  imageUrl: 'https://example.com/image.jpg',
  rawData: {},
  status: 'ACTIVE',
  metadata: null,
  createdAt: new Date('2026-03-30T10:00:00Z'),
  updatedAt: new Date('2026-03-30T10:00:00Z'),
  ...overrides,
});

export const createPromptFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'prompt-123',
  name: 'WordPress Blog Post Template',
  platform: Platform.WORDPRESS as Platform,
  contentType: ContentType.BLOG_POST as ContentType,
  template: `Write a compelling blog post about {{name}}.

Description: {{description}}
Price: {{price}}
Commission: {{commission}}%
Affiliate Link: {{affiliateLink}}

Make it SEO-friendly and persuasive.`,
  isActive: true,
  createdAt: new Date('2026-03-30T10:00:00Z'),
  updatedAt: new Date('2026-03-30T10:00:00Z'),
  ...overrides,
});

export const createGeneratedContentFixture = (overrides: Record<string, unknown> = {}) => ({
  title: 'Top 5 Benefits of Test Product for 2026',
  body: `Test Product is a game-changer in its category. Here's why thousands of affiliates are promoting it:

1. **Premium Quality** - Made with the finest materials
2. **Affordable Price** - Just $29.99 per unit
3. **High Commission** - Earn 10% on every sale
4. **Fast Shipping** - Delivered within 2-3 days
5. **30-Day Guarantee** - Risk-free purchase

Get your affiliate link today: https://example.com/aff?ref=test`,
  ...overrides,
});

export const createGeminiResponseFixture = (overrides: Record<string, unknown> = {}) => {
  const defaults = {
    title: 'Top 5 Benefits of Test Product for 2026',
    body: 'Test Product is a game-changer...',
  };
  return { ...defaults, ...overrides };
};

export const createGeminiRawTextFixture = (text: string = 'This is raw text response') => {
  return { text };
};
