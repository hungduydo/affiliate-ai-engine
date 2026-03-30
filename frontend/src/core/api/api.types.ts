export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';
export type Platform = 'WORDPRESS' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE' | 'SHOPIFY';
export type ContentType = 'BLOG_POST' | 'SOCIAL_POST' | 'VIDEO_SCRIPT';
export type ContentStatus = 'RAW' | 'AI_PROCESSING' | 'GENERATED' | 'PENDING_APPROVAL' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
export type PublishStatus = 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING';

export interface Product {
  id: string;
  externalId: string;
  source: string;
  name: string;
  description?: string;
  price?: number;
  commission?: number;
  affiliateLink: string;
  imageUrl?: string;
  status: ProductStatus;
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
