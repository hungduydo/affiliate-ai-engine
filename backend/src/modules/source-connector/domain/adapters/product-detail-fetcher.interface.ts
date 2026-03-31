export interface ProductImage {
  url: string;
  isPrimary?: boolean;
}

export interface ProductVideo {
  url: string;
  thumbnailUrl?: string;
}

export interface ProductDetail {
  /** Written to the description column if currently null/empty */
  description?: string;
  /** Written to the imageUrl column if currently null */
  primaryImageUrl?: string;
  /** Stored in metadata.gallery */
  images?: ProductImage[];
  /** Stored in metadata.videos */
  videos?: ProductVideo[];
  /** Stored in metadata.rating */
  rating?: number;
  /** Stored in metadata.reviewCount */
  reviewCount?: number;
  /** Stored in metadata.categories */
  categories?: string[];
  /** Written to the price column if currently null */
  price?: number;
}

export interface IProductDetailFetcher {
  readonly source: string;
  fetchDetail(productLink: string, externalId: string): Promise<ProductDetail | null>;
}
