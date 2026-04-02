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
  | 'FACEBOOK'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'SHOPIFY'
  | 'BUFFER_TWITTER'
  | 'BUFFER_INSTAGRAM'
  | 'BUFFER_LINKEDIN'
  | 'BUFFER_TIKTOK'
  | 'BUFFER_PINTEREST'
  | 'BUFFER_FACEBOOK'
  | 'BUFFER_YOUTUBE'
  | 'BUFFER_MASTODON'
  | 'BUFFER_THREADS';
export type ContentType = 'BLOG_POST' | 'SOCIAL_POST' | 'VIDEO_SCRIPT' | 'CAROUSEL' | 'THREAD' | 'HERO_COPY';

export interface ProductDNA {
  coreProblem: string;
  keyFeatures: Array<{ feature: string; emotionalBenefit: string }>;
  targetPersona: { demographics: string; psychographics: string };
  objectionHandling: Array<{ objection: string; counter: string }>;
  visualAnchors: string[];
}
export type ContentStatus = 'RAW' | 'AI_PROCESSING' | 'GENERATED' | 'PENDING_APPROVAL' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
export type PublishStatus = 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
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

export interface PublishLog {
  id: string;
  contentId: string;
  platform: Platform;
  publishedLink?: string;
  status: PublishStatus;
  errorMessage?: string;
  publishedAt?: string;
  createdAt: string;
  content?: Pick<Content, 'title' | 'platform' | 'contentType'>;
}
