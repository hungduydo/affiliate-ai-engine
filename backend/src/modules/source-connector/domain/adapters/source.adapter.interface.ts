export interface ScrapedProduct {
  externalId: string;
  source: string;
  name: string;
  description?: string;
  price?: number;
  commission?: number;
  imageUrl?: string;
  affiliateLink?: string;
  productLink?: string;
  rawData: Record<string, unknown>;
}

export interface ISourceAdapter {
  readonly source: string;
  fetchProducts(keyword: string, limit: number): Promise<ScrapedProduct[]>;
}
