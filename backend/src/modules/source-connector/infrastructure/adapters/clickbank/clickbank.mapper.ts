import { ScrapedProduct } from '../../../domain/adapters/source.adapter.interface';

export interface ClickBankMarketplaceItem {
  site: string;
  title: string;
  description?: string;
  initialDollarSale?: number;
  recurring?: boolean;
  gravity?: number;
  [key: string]: unknown;
}

export function mapClickBankItem(item: ClickBankMarketplaceItem, clerkId: string): ScrapedProduct {
  return {
    externalId: item.site,
    source: 'clickbank',
    name: item.title,
    description: item.description,
    price: item.initialDollarSale,
    commission: 75, // ClickBank default; per-product rate in rawData
    imageUrl: undefined,
    rawData: item as Record<string, unknown>,
  };
}
