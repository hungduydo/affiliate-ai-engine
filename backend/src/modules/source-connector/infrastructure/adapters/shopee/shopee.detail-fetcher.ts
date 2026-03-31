import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IProductDetailFetcher, ProductDetail, ProductImage, ProductVideo } from '../../../domain/adapters/product-detail-fetcher.interface';

/** Response shape from the shopee-crawler microservice */
interface CrawlerResponse {
  ok: boolean;
  data?: {
    title?: string;
    description?: string;
    price?: number | null;
    currency?: string;
    categories?: string[];
    images?: string[];
    videos?: Array<{ url: string; thumbnail_url?: string | null }>;
    shop_id?: number | null;
    item_id?: number | null;
    rating_star?: number | null;
    rating_count?: number | null;
    source?: string;
  };
  error?: string;
}

@Injectable()
export class ShopeeDetailFetcher implements IProductDetailFetcher {
  readonly source = 'shopee';
  private readonly logger = new Logger(ShopeeDetailFetcher.name);
  private readonly crawlerBaseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.crawlerBaseUrl = this.config.get<string>('SHOPEE_CRAWLER_URL', 'http://localhost:3002');
  }

  async fetchDetail(productLink: string, externalId: string): Promise<ProductDetail | null> {
    const { shopId, itemId } = this.parseShopeeIds(productLink, externalId);
    if (!shopId || !itemId) {
      this.logger.warn(`Cannot extract shop_id/item_id from link="${productLink}" externalId="${externalId}"`);
      return null;
    }

    const url = `${this.crawlerBaseUrl}/api/product?shop_id=${shopId}&item_id=${itemId}`;
    this.logger.log(`Fetching Shopee detail via crawler: ${url}`);

    try {
      const response = await firstValueFrom(
        this.http.get<CrawlerResponse>(url, { timeout: 60_000 }),
      );

      const { data: crawlerData } = response;
      if (!crawlerData?.ok || !crawlerData.data) {
        this.logger.warn(`Crawler returned error for ${productLink}: ${crawlerData?.error ?? 'no data'}`);
        return null;
      }

      return this.mapCrawlerResponse(crawlerData.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Crawler request failed for ${productLink}: ${message}`);
      return null;
    }
  }

  /**
   * Extract shopId and itemId from a Shopee product URL or externalId.
   *
   * Supported URL formats:
   *   - https://shopee.vn/product/SHOP_ID/ITEM_ID
   *   - https://shopee.vn/SLUG-i.SHOP_ID.ITEM_ID
   */
  private parseShopeeIds(productLink: string, externalId: string): { shopId: string | null; itemId: string | null } {
    // Try /product/SHOP_ID/ITEM_ID format
    const productMatch = productLink.match(/\/product\/(\d+)\/(\d+)/);
    if (productMatch) {
      return { shopId: productMatch[1], itemId: productMatch[2] };
    }

    // Try -i.SHOP_ID.ITEM_ID format
    const slugMatch = productLink.match(/-i\.(\d+)\.(\d+)/);
    if (slugMatch) {
      return { shopId: slugMatch[1], itemId: slugMatch[2] };
    }

    // Fallback: externalId might be the itemId itself
    if (/^\d+$/.test(externalId)) {
      this.logger.debug(`Using externalId as itemId: ${externalId}, but no shopId available`);
    }

    return { shopId: null, itemId: null };
  }

  private mapCrawlerResponse(data: NonNullable<CrawlerResponse['data']>): ProductDetail {
    const images: ProductImage[] = (data.images ?? []).map((url, i) => ({
      url,
      isPrimary: i === 0,
    }));

    const videos: ProductVideo[] = (data.videos ?? [])
      .filter((v) => v.url)
      .map((v) => ({
        url: v.url,
        thumbnailUrl: v.thumbnail_url ?? undefined,
      }));

    return {
      description: data.description || undefined,
      primaryImageUrl: images[0]?.url,
      images,
      videos,
      rating: data.rating_star ?? undefined,
      reviewCount: data.rating_count ?? undefined,
      categories: data.categories?.filter(Boolean),
      price: data.price ?? undefined,
    };
  }
}
