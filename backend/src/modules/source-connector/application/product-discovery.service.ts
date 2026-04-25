import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { DiscoverProduct } from '../../config/application/discovery-cache.service';

export interface DiscoverResponse {
  products: DiscoverProduct[];
  cached: boolean;
  updatedAt: string;
  partial?: boolean;
  failedAdvertisers?: { name: string; error: string }[];
  warningCode?: 'NO_JOINED_ADVERTISERS';
}

export interface IngestDiscoverDto {
  product: DiscoverProduct;
  platform: string;
  contentType: string;
  source: string;
}

export interface IngestDiscoverResponse {
  productId: string;
  contentId: string;
  jobId: string;
}

// 10 fixture products for DISCOVERY_MOCK=true
const MOCK_PRODUCTS: Omit<DiscoverProduct, 'imported'>[] = [
  { externalId: 'MOCK-001', name: 'Premium VPN Service', description: '5-device VPN with no-logs policy and 60+ countries.', commission: 0.45, epc: 1.20, price: 99.99, affiliateLink: 'https://example.com/vpn?ref=mock', imageUrl: undefined, advertiserName: 'SecureNet Inc.', category: 'Software', score: 0.54 },
  { externalId: 'MOCK-002', name: 'SEO Audit Tool Pro', description: 'Full-site SEO analysis, backlink checker, keyword tracking.', commission: 0.35, epc: 0.90, price: 149.00, affiliateLink: 'https://example.com/seo?ref=mock', imageUrl: undefined, advertiserName: 'RankBoost', category: 'Software', score: 0.315 },
  { externalId: 'MOCK-003', name: 'Keto Diet Meal Plan', description: '30-day personalized keto plan with shopping lists.', commission: 0.55, epc: 0.75, price: 39.99, affiliateLink: 'https://example.com/keto?ref=mock', imageUrl: undefined, advertiserName: 'HealthStart', category: 'Health', score: 0.4125 },
  { externalId: 'MOCK-004', name: 'Online Trading Course', description: 'Beginner to advanced stock trading, 40+ video lessons.', commission: 0.50, epc: 2.10, price: 299.00, affiliateLink: 'https://example.com/trading?ref=mock', imageUrl: undefined, advertiserName: 'TradeAcademy', category: 'Finance', score: 1.05 },
  { externalId: 'MOCK-005', name: 'Password Manager Family', description: 'Unlimited passwords, 6 users, dark web monitoring.', commission: 0.30, epc: 0.80, price: 79.99, affiliateLink: 'https://example.com/pwmgr?ref=mock', imageUrl: undefined, advertiserName: 'LockBox', category: 'Software', score: 0.24 },
  { externalId: 'MOCK-006', name: 'Collagen Peptides Powder', description: 'Grass-fed collagen, unflavored, 30 servings.', commission: 0.25, epc: 0.65, price: 34.99, affiliateLink: 'https://example.com/collagen?ref=mock', imageUrl: undefined, advertiserName: 'PureHealth', category: 'Health', score: 0.1625 },
  { externalId: 'MOCK-007', name: 'Shopify Dropshipping Course', description: 'Build a 6-figure dropshipping store from scratch.', commission: 0.60, epc: 1.80, price: 197.00, affiliateLink: 'https://example.com/shopify-course?ref=mock', imageUrl: undefined, advertiserName: 'eCom Masters', category: 'E-commerce', score: 1.08 },
  { externalId: 'MOCK-008', name: 'IELTS Preparation Bundle', description: 'Band 7+ guaranteed program with mock tests.', commission: 0.40, epc: 0.95, price: 89.00, affiliateLink: 'https://example.com/ielts?ref=mock', imageUrl: undefined, advertiserName: 'StudyPath', category: 'Education', score: 0.38 },
  { externalId: 'MOCK-009', name: 'Cloud Accounting Software', description: 'Invoicing, payroll, and tax filing for freelancers.', commission: 0.35, epc: 1.10, price: 120.00, affiliateLink: 'https://example.com/accounting?ref=mock', imageUrl: undefined, advertiserName: 'CloudBooks', category: 'Software', score: 0.385 },
  { externalId: 'MOCK-010', name: 'Forex Signals Premium', description: 'Live forex signals, 85% win rate, 24/7 support.', commission: 0.50, epc: 1.60, price: 79.00, affiliateLink: 'https://example.com/forex?ref=mock', imageUrl: undefined, advertiserName: 'FXPro Signals', category: 'Finance', score: 0.80 },
];

@Injectable()
export class ProductDiscoveryService {
  private readonly logger = new Logger(ProductDiscoveryService.name);
  private readonly internalUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.internalUrl = this.configService.get<string>('BACKEND_INTERNAL_URL', 'http://localhost:3000');
  }

  async discover(force = false): Promise<DiscoverResponse> {
    const products = MOCK_PRODUCTS.map((p) => ({ ...p, imported: false }));

    if (!force) {
      try {
        const cache = await this.getCache();
        if (cache.data && cache.updatedAt) {
          const ageMs = Date.now() - new Date(cache.updatedAt).getTime();
          const ageMinutes = Math.round(ageMs / 60000);
          if (ageMs < 6 * 60 * 60 * 1000) {
            const externalIds = cache.data.map((p) => p.externalId);
            const existingIds = await this.getExistingIds(externalIds);
            const cachedProducts = cache.data.map((p) => ({ ...p, imported: existingIds.includes(p.externalId) }));
            this.logger.debug(`[discovery] cache hit, age: ${ageMinutes}m, ${cachedProducts.length} products`);
            return {
              products: cachedProducts,
              cached: true,
              updatedAt: cache.updatedAt,
            };
          }
        }
      } catch {
        // Cache read failure — proceed to return default
      }
    }

    const existingIds = await this.getExistingIds(products.map((p) => p.externalId));
    const productsWithImportStatus = products.map((p) => ({ ...p, imported: existingIds.includes(p.externalId) }));

    const updatedAt = new Date().toISOString();

    try {
      await this.putCache({
        data: productsWithImportStatus,
        updatedAt,
      });
    } catch (err: any) {
      this.logger.warn(`[discovery] cache write failed: ${err.message}`);
    }

    return {
      products: productsWithImportStatus,
      cached: false,
      updatedAt,
    };
  }

  async ingestDiscover(dto: IngestDiscoverDto): Promise<IngestDiscoverResponse> {
    const { product, platform, contentType, source } = dto;

    // Map DiscoverProduct → CreateProductDto
    const productPayload = {
      externalId: product.externalId,
      source,
      name: product.name,
      description: product.description,
      price: product.price,
      commission: product.commission,
      imageUrl: product.imageUrl,
      affiliateLink: product.affiliateLink,
      rawData: {
        epc: product.epc,
        advertiserName: product.advertiserName,
        category: product.category,
        score: product.score,
      },
    };

    // Save product (upsert)
    const productRes = await firstValueFrom(
      this.http.post<{ id: string }>(`${this.internalUrl}/api/internal/products`, productPayload),
    );
    const productId = productRes.data.id;

    // Create content + generation job
    let contentRes: { contentId: string; jobId: string };
    try {
      const res = await firstValueFrom(
        this.http.post<{ contentId: string; jobId: string }>(`${this.internalUrl}/api/content`, {
          productId,
          platform,
          contentType,
        }),
      );
      contentRes = res.data;
    } catch (err: any) {
      throw new HttpException(`Content creation failed: ${err.message}`, 500);
    }

    this.logger.log(`[discovery] imported product ${product.externalId} for ${platform}/${contentType}`);

    return { productId, contentId: contentRes.contentId, jobId: contentRes.jobId };
  }

  private async getCache() {
    const res = await firstValueFrom(
      this.http.get<{
        data: DiscoverProduct[] | null;
        updatedAt: string | null;
        partial?: boolean;
        failedAdvertisers?: { name: string; error: string }[];
      }>(`${this.internalUrl}/api/internal/discovery-cache`),
    );
    return res.data;
  }

  private async putCache(payload: {
    data: DiscoverProduct[];
    updatedAt: string;
    partial?: boolean;
    failedAdvertisers?: { name: string; error: string }[];
  }) {
    await firstValueFrom(this.http.put(`${this.internalUrl}/api/internal/discovery-cache`, payload));
  }

  private async getExistingIds(externalIds: string[]): Promise<string[]> {
    if (externalIds.length === 0) return [];
    try {
      const params = new URLSearchParams();
      externalIds.forEach((id) => params.append('externalIds', id));
      const res = await firstValueFrom(
        this.http.get<{ existingIds: string[] }>(
          `${this.internalUrl}/api/internal/products/exists?${params.toString()}`,
        ),
      );
      return res.data.existingIds;
    } catch (err: any) {
      this.logger.warn(`[discovery] exists check failed: ${err.message}`);
      return [];
    }
  }
}
