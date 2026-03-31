import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProductDetailFetcher, ProductDetail, ProductImage, ProductVideo } from '../../../domain/adapters/product-detail-fetcher.interface';
import { readShopeeCookies } from './shopee.cookies';

const REALISTIC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** Prefix for Shopee CDN image hashes */
const SHOPEE_CDN = 'https://cf.shopee.vn/file/';

@Injectable()
export class ShopeeDetailFetcher implements IProductDetailFetcher {
  readonly source = 'shopee';
  private readonly logger = new Logger(ShopeeDetailFetcher.name);

  constructor(private readonly config: ConfigService) {}

  async fetchDetail(productLink: string, _externalId: string): Promise<ProductDetail | null> {
    const cookieFilePath = this.config.getOrThrow<string>('SHOPEE_COOKIE_FILE_PATH');
    const cookies = readShopeeCookies(cookieFilePath);

    const { chromium } = await import('playwright-extra');
    const stealth = (await import('puppeteer-extra-plugin-stealth')).default;
    chromium.use(stealth());

    const browser = await chromium.launch({ headless: true });
    let detail: ProductDetail | null = null;

    try {
      const context = await browser.newContext({ userAgent: REALISTIC_UA });
      await context.addCookies(cookies);
      const page = await context.newPage();

      page.on('response', async (response) => {
        if (detail) return; // Already captured
        try {
          const contentType = response.headers()['content-type'] ?? '';
          if (!contentType.includes('application/json')) return;

          const json = await response.json() as Record<string, unknown>;
          // Shopee detail pages load product data in various API shapes
          const item =
            (json?.item as Record<string, unknown> | undefined) ??
            ((json?.data as Record<string, unknown> | undefined)?.item as Record<string, unknown> | undefined);

          if (item && typeof item.description === 'string') {
            detail = mapShopeeDetail(item);
            this.logger.log(`Shopee detail intercepted for ${productLink}`);
          }
        } catch {
          // Ignore non-JSON or parse errors
        }
      });

      await page.goto(productLink, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
    } finally {
      await browser.close();
    }

    if (!detail) {
      this.logger.warn(`Shopee: no detail intercepted for ${productLink}. Check DevTools for API endpoint shape.`);
    }
    return detail;
  }
}

function toImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null;
  // Bare hash (no slashes) → prefix with CDN base
  return raw.startsWith('http') ? raw : `${SHOPEE_CDN}${raw}`;
}

function mapShopeeDetail(item: Record<string, unknown>): ProductDetail {
  const description = typeof item.description === 'string' ? item.description : undefined;

  const rawImages = Array.isArray(item.images) ? (item.images as unknown[]) : [];
  const images: ProductImage[] = rawImages.flatMap((img, i) => {
    const url = toImageUrl(img);
    return url ? [{ url, isPrimary: i === 0 } as ProductImage] : [];
  });

  const rawVideos = Array.isArray(item.video_info_list)
    ? (item.video_info_list as Record<string, unknown>[])
    : [];
  const videos: ProductVideo[] = rawVideos
    .filter((v) => typeof v.video_url === 'string')
    .map((v) => ({
      url: v.video_url as string,
      thumbnailUrl: typeof v.thumbnail === 'string' ? v.thumbnail : undefined,
    }));

  const ratingObj = item.item_rating as Record<string, unknown> | undefined;
  const rating = typeof ratingObj?.rating_star === 'number' ? ratingObj.rating_star : undefined;
  const ratingCount = Array.isArray(ratingObj?.rating_count)
    ? (ratingObj.rating_count as number[]).reduce((a, b) => a + b, 0)
    : undefined;

  const rawCategories = Array.isArray(item.categories)
    ? (item.categories as Record<string, unknown>[])
    : [];
  const categories = rawCategories
    .map((c) => c.display_name as string)
    .filter(Boolean);

  return {
    description,
    primaryImageUrl: images[0]?.url,
    images,
    videos,
    rating,
    reviewCount: ratingCount,
    categories,
  };
}
