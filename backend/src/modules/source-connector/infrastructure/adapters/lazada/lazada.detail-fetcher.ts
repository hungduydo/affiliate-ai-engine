import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { IProductDetailFetcher, ProductDetail } from '../../../domain/adapters/product-detail-fetcher.interface';
import { mapLazadaDetail } from './lazada.mapper';

const REALISTIC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

@Injectable()
export class LazadaDetailFetcher implements IProductDetailFetcher {
  readonly source = 'lazada';
  private readonly logger = new Logger(LazadaDetailFetcher.name);

  constructor(private readonly config: ConfigService) {}

  async fetchDetail(productLink: string, _externalId: string): Promise<ProductDetail | null> {
    const { chromium } = await import('playwright-extra');
    const stealth = (await import('puppeteer-extra-plugin-stealth')).default;
    chromium.use(stealth());

    const browser = await chromium.launch({ headless: true });
    let detail: ProductDetail | null = null;

    try {
      const context = await browser.newContext({ userAgent: REALISTIC_UA });

      const cookieFilePath = this.config.get<string>('LAZADA_COOKIE_FILE_PATH');
      if (cookieFilePath && fs.existsSync(cookieFilePath)) {
        const cookies = JSON.parse(fs.readFileSync(cookieFilePath, 'utf-8')) as unknown[];
        if (Array.isArray(cookies)) {
          await context.addCookies(cookies as Parameters<typeof context.addCookies>[0]);
        }
      }

      const page = await context.newPage();

      page.on('response', async (response) => {
        if (detail) return;
        const url = response.url();
        if (!url.includes('acs.lazada.com') && !url.includes('rest.lazada.com') && !url.includes('lazada.com/pdp')) {
          return;
        }
        try {
          const contentType = response.headers()['content-type'] ?? '';
          if (!contentType.includes('application/json')) return;
          const json = await response.json() as Record<string, unknown>;
          const mapped = mapLazadaDetail(json);
          if (mapped) {
            detail = mapped;
            this.logger.log(`Lazada detail intercepted for ${productLink}`);
          }
        } catch {
          // Ignore parse errors
        }
      });

      // Random delay to appear more human-like
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 1200));
      await page.goto(productLink, { waitUntil: 'networkidle', timeout: 35000 });
      await page.waitForTimeout(2000);
    } finally {
      await browser.close();
    }

    if (!detail) {
      this.logger.warn(`Lazada: no detail intercepted for ${productLink}. Check DevTools for correct API endpoint.`);
    }
    return detail;
  }
}
