import { Injectable } from '@nestjs/common';

@Injectable()
export class DeeplinkGenerator {
  generate(source: string, externalId: string, baseUrl?: string): string {
    switch (source.toLowerCase()) {
      case 'shopee':
        return this.shopeeLink(externalId, baseUrl);
      default:
        return baseUrl ?? `https://affiliate.example.com/${source}/${externalId}`;
    }
  }

  private shopeeLink(productId: string, baseUrl?: string): string {
    // If an affiliate link is provided, use it directly
    if (baseUrl) {
      return baseUrl;
    }
    // Otherwise, generate a generic deeplink
    const appId = process.env.SHOPEE_APP_ID ?? '';
    return `https://shope.ee/affiliate?app_id=${appId}&product_id=${productId}&url=`;
  }
}
