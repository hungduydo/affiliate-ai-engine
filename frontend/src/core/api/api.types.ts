export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ProductStatus = 'RAW' | 'ENRICHED' | 'ACTIVE' | 'INACTIVE';
export type EnrichStatus = 'PENDING' | 'ENRICHING' | 'DONE' | 'FAILED' | 'SKIPPED';

export type Platform =
  | 'WORDPRESS'
  | 'SHOPIFY'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'TWITTER'
  | 'LINKEDIN'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'PINTEREST'
  | 'MASTODON'
  | 'THREADS';

export const PLATFORM_LABELS: Record<Platform, string> = {
  WORDPRESS: 'WordPress',
  SHOPIFY: 'Shopify',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TWITTER: 'Twitter / X',
  LINKEDIN: 'LinkedIn',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  PINTEREST: 'Pinterest',
  MASTODON: 'Mastodon',
  THREADS: 'Threads',
};

export const PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];

export type ContentType = 'BLOG_POST' | 'SOCIAL_POST' | 'VIDEO_SCRIPT' | 'CAROUSEL' | 'THREAD' | 'HERO_COPY';

export interface ProductDNA {
  coreProblem: string;
  keyFeatures: Array<{ feature: string; emotionalBenefit: string }>;
  targetPersona: { demographics: string; psychographics: string };
  objectionHandling: Array<{ objection: string; counter: string }>;
  visualAnchors: string[];
}

export type ContentStatus = 'RAW' | 'AI_PROCESSING' | 'GENERATED' | 'PENDING_APPROVAL' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
export type PublishStatus = 'PENDING' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING';

export interface ProductMetadata {
  gallery?: { url: string; isPrimary?: boolean }[];
  videos?: { url: string; thumbnailUrl?: string }[];
  rating?: number;
  reviewCount?: number;
  categories?: string[];
}

export interface Product {
  id: string;
  externalId: string;
  source: string;
  name: string;
  description?: string;
  price?: number;
  commission?: number;
  affiliateLink: string;
  productLink?: string;
  imageUrl?: string;
  status: ProductStatus;
  enrichStatus?: EnrichStatus;
  enrichedAt?: string;
  metadata?: ProductMetadata;
  productDna?: ProductDNA;
  dnaExtractedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Content {
  id: string;
  productId: string;
  platform: Platform;
  contentType: ContentType;
  title?: string;
  body: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  product?: Pick<Product, 'name' | 'source'>;
}

export interface PromptTemplate {
  id: string;
  name: string;
  platform: Platform;
  contentType: ContentType;
  template: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorStatus {
  clickbank: boolean;
  cj: boolean;
  shopee: boolean;
  wordpress: boolean;
  facebook: boolean;
  shopify: boolean;
  gemini: boolean;
}

// ---------------------------------------------------------------------------
// Publishing providers
// ---------------------------------------------------------------------------

export type ProviderKey = 'BUFFER' | 'PUBLER' | 'DIRECT';

export const PROVIDER_KEY_LABELS: Record<ProviderKey, string> = {
  BUFFER: 'Buffer',
  PUBLER: 'Publer',
  DIRECT: 'Direct (WordPress / Shopify / Facebook)',
};

/** Platforms each provider type can support — used to constrain the platform multi-select in settings */
export const PROVIDER_SUPPORTED_PLATFORMS: Record<ProviderKey, Platform[]> = {
  BUFFER: ['FACEBOOK', 'INSTAGRAM', 'TWITTER', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'PINTEREST', 'MASTODON', 'THREADS'],
  PUBLER: ['TWITTER', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'PINTEREST'],
  DIRECT: ['WORDPRESS', 'SHOPIFY', 'FACEBOOK'],
};

/** Lightweight provider info returned by GET /publishing/providers?platform=... — no credentials */
export interface ProviderInfo {
  id: string;
  key: ProviderKey;
  label: string;
}

/** Full provider record returned by GET /config/providers — no credentials */
export interface PublishProvider {
  id: string;
  key: ProviderKey;
  label: string;
  enabledPlatforms: Platform[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublishAsset {
  url: string;
  type: 'image' | 'video';
}

export interface PublishLog {
  id: string;
  contentId: string;
  platform: Platform;
  provider?: string;
  providerId?: string;
  publishedLink?: string;
  status: PublishStatus;
  errorMessage?: string;
  publishedAt?: string;
  scheduledAt?: string;
  assets?: PublishAsset[];
  createdAt: string;
  content?: Pick<Content, 'title' | 'platform' | 'contentType'>;
}
