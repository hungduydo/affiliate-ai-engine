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
    const capturedResponses: Array<{ url: string; status: number; contentType: string }> = [];
    const startTime = Date.now();

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

      // Log page console messages
      page.on('console', (msg) => {
        this.logger.debug(`[Lazada Page Console] ${msg.type()}: ${msg.text()}`);
      });

      // Log page errors
      page.on('pageerror', (error) => {
        this.logger.warn(`[Lazada Page Error]: ${error.message}`);
      });

      page.on('response', async (response) => {
        const url = response.url();
        const status = response.status();
        const contentType = response.headers()['content-type'] ?? '';

        capturedResponses.push({ url, status, contentType });

        // Check for known Lazada API endpoints
        const isLazadaKnownApi =
          url.includes('acs.lazada.com') || url.includes('rest.lazada.com') || url.includes('lazada.com/pdp');

        const marker = isLazadaKnownApi ? '📦' : '  ';
        this.logger.debug(
          `[Lazada Response] ${marker} ${status} ${url.substring(0, 80)}... | CT: ${contentType.substring(0, 40)}`
        );

        if (detail) return;

        // Check if URL matches Lazada API patterns
        const isLazadaApi = url.includes('acs.lazada.com') || url.includes('rest.lazada.com') || url.includes('lazada.com/pdp');
        if (!isLazadaApi) {
          return;
        }

        this.logger.debug(`[Lazada API Match] ${url.substring(0, 80)}`);

        try {
          const contentType = response.headers()['content-type'] ?? '';
          if (!contentType.includes('application/json')) return;

          const json = await response.json() as Record<string, unknown>;
          const jsonKeys = Object.keys(json).slice(0, 5).join(', ');
          this.logger.debug(`[Lazada JSON Keys] ${jsonKeys}`);

          // Log first 1000 chars of JSON to understand structure
          const jsonStr = JSON.stringify(json).substring(0, 1000);
          this.logger.debug(`[Lazada JSON Preview] ${jsonStr}`);

          const mapped = mapLazadaDetail(json);
          if (mapped) {
            detail = mapped;
            this.logger.log(`✓ Lazada detail intercepted for ${productLink} (${Date.now() - startTime}ms)`);
          } else {
            this.logger.debug(`[Lazada mapLazadaDetail returned null] Check mapper logic. Full response: ${jsonStr}`);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          this.logger.debug(`[Lazada JSON Parse Error] ${errorMsg} from ${url.substring(0, 60)}`);
        }
      });

      this.logger.debug(`[Lazada Navigating] to ${productLink}`);
      const navStartTime = Date.now();

      // Random delay to appear more human-like
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 1200));
      await page.goto(productLink, { waitUntil: 'networkidle', timeout: 35000 });
      this.logger.debug(`[Lazada Navigation Complete] ${Date.now() - navStartTime}ms`);

      await page.waitForTimeout(2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Lazada Browser Error] ${errorMsg}`);
    } finally {
      await browser.close();
    }

    if (!detail) {
      const totalTime = Date.now() - startTime;
      this.logger.warn(
        `Lazada: no detail intercepted for ${productLink} (${totalTime}ms). ` +
        `Captured ${capturedResponses.length} responses. ` +
        `Check logs above for 📦 known Lazada API endpoints.`
      );

      // Log all ACS/REST/PDP API responses
      const knownLazadaApis = capturedResponses.filter((r) => {
        return r.url.includes('acs.lazada.com') || r.url.includes('rest.lazada.com') || r.url.includes('lazada.com/pdp');
      });

      if (knownLazadaApis.length > 0) {
        this.logger.debug(`[Lazada Known APIs] (${knownLazadaApis.length} found):`);
        knownLazadaApis.forEach((r) => {
          this.logger.debug(`  ${r.status} ${r.url.substring(0, 100)}`);
        });
      }

      // Also log any other API-like URLs
      const otherApiUrls = capturedResponses.filter(
        (r) =>
          !r.url.includes('acs.lazada.com') &&
          !r.url.includes('rest.lazada.com') &&
          !r.url.includes('lazada.com/pdp') &&
          (r.url.includes('/api/') || r.url.includes('/item') || r.url.includes('/product'))
      );

      if (otherApiUrls.length > 0) {
        this.logger.debug(`[Lazada Other API URLs] (${otherApiUrls.length} found):`);
        otherApiUrls.forEach((r) => {
          this.logger.debug(`  ${r.status} ${r.url.substring(0, 100)}`);
        });
      }
    }
    return detail;
  }
}
