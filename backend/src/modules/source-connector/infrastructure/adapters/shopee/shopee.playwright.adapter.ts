import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { ISourceAdapter, ScrapedProduct } from '../../../domain/adapters/source.adapter.interface';
import { mapShopeeItem, ShopeeOfferItem } from './shopee.mapper';

@Injectable()
export class ShopeePlaywrightAdapter implements ISourceAdapter {
  readonly source = 'shopee';
  private readonly logger = new Logger(ShopeePlaywrightAdapter.name);
  private readonly portalUrl = 'https://affiliate.shopee.vn/offer/product_offer';

  constructor(private readonly config: ConfigService) {}

  async fetchProducts(keyword: string, limit: number): Promise<ScrapedProduct[]> {
    const cookieFilePath = this.config.getOrThrow<string>('SHOPEE_COOKIE_FILE_PATH');

    if (!fs.existsSync(cookieFilePath)) {
      throw new Error(`Shopee cookie file not found: ${cookieFilePath}. Please log in and save cookies.`);
    }

    const cookiesRaw = fs.readFileSync(cookieFilePath, 'utf-8');
    const parsed = JSON.parse(cookiesRaw) as unknown;

    type RawCookie = Record<string, unknown>;
    let rawCookies: RawCookie[];

    if (Array.isArray(parsed)) {
      // Standard format: [{ name, value, domain, ... }, ...]
      rawCookies = parsed as RawCookie[];
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as RawCookie).cookies)) {
      // Wrapped format: { cookies: [...] }
      rawCookies = (parsed as RawCookie).cookies as RawCookie[];
    } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Key-value map format: { cookieName: cookieValue, ... } (e.g. exported from EditThisCookie)
      rawCookies = Object.entries(parsed as Record<string, string>).map(([name, value]) => ({
        name,
        value: String(value),
        domain: '.shopee.vn',
        path: '/',
      }));
    } else {
      throw new Error(`Shopee cookie file format not recognized. Expected array or object, found: ${typeof parsed}`);
    }

    const cookies = rawCookies.map((c) => ({
      name: c.name as string,
      value: c.value as string,
      domain: (c.domain as string | undefined) ?? '.shopee.vn',
      path: (c.path as string | undefined) ?? '/',
      httpOnly: c.httpOnly as boolean | undefined,
      secure: c.secure as boolean | undefined,
      sameSite: (c.sameSite as 'Strict' | 'Lax' | 'None' | undefined),
    }));

    // Dynamically import playwright to avoid loading it when unused
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    await context.addCookies(cookies);

    const page = await context.newPage();
    const interceptedProducts: ShopeeOfferItem[] = [];

    // Intercept background API response containing product list
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/offer/') || url.includes('/product') || url.includes('affiliate')) {
        try {
          const contentType = response.headers()['content-type'] ?? '';
          if (contentType.includes('application/json')) {
            const json = await response.json();
            // Look for array of products in common response shapes
            const candidates = json?.data?.products ?? json?.products ?? json?.data?.items ?? json?.items ?? json?.data ?? [];
            if (Array.isArray(candidates) && candidates.length > 0) {
              interceptedProducts.push(...candidates);
            }
          }
        } catch {
          // Ignore non-JSON or parse errors
        }
      }
    });

    const searchUrl = `${this.portalUrl}?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a bit for any delayed API calls
    await page.waitForTimeout(2000);

    await browser.close();

    if (interceptedProducts.length > 0) {
      this.logger.log(`Shopee intercepted ${interceptedProducts.length} products via API for keyword: ${keyword}`);
      return interceptedProducts.slice(0, limit).map(mapShopeeItem);
    }

    // NOTE: If network interception yields no results, check DevTools on affiliate.shopee.vn
    // to find the correct API endpoint and response structure. Update the URL filter above.
    this.logger.warn('Shopee: no products intercepted from network. Check DevTools for correct API endpoint.');
    return [];
  }
}
