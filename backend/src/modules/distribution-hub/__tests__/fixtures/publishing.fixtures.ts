import { Platform, PublishStatus } from '@prisma-client/distribution-hub';

export const createPublishLogFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'log-123',
  contentId: 'content-abc',
  platform: Platform.FACEBOOK,
  provider: 'BUFFER',
  providerId: 'provider-xyz',
  publishedLink: null,
  status: PublishStatus.PENDING,
  errorMessage: null,
  publishedAt: null,
  scheduledAt: null,
  assets: null,
  bufferMode: null,
  bufferDueAt: null,
  createdAt: new Date('2026-04-01T10:00:00Z'),
  updatedAt: new Date('2026-04-01T10:00:00Z'),
  ...overrides,
});

export const createProviderFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'provider-xyz',
  key: 'BUFFER',
  label: 'My Buffer',
  enabledPlatforms: ['FACEBOOK', 'INSTAGRAM', 'TWITTER'],
  credentials: {
    apiToken: 'buf_test_token',
    organizationId: 'org-123',
  },
  isActive: true,
  createdAt: new Date('2026-04-01T10:00:00Z'),
  updatedAt: new Date('2026-04-01T10:00:00Z'),
  ...overrides,
});

export const createContentFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'content-abc',
  productId: 'prod-xyz',
  title: 'Test Article Title',
  body: 'This is the body of the test content.',
  imageUrl: 'https://example.com/image.jpg',
  platform: 'FACEBOOK',
  status: 'GENERATED',
  ...overrides,
});

export const createPublishPayloadFixture = (overrides: Record<string, unknown> = {}) => ({
  title: 'Test Title',
  body: 'Test body content for publishing.',
  imageUrl: 'https://example.com/image.jpg',
  ...overrides,
});

export const createProviderCredentialsFixture = (overrides: Record<string, string | undefined> = {}) => ({
  apiToken: 'buf_test_token_123',
  organizationId: 'org-abc-456',
  ...overrides,
});
