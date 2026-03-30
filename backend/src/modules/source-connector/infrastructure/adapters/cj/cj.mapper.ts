import { ScrapedProduct } from '../../../domain/adapters/source.adapter.interface';

export interface CJProduct {
  sku: string;
  name: string;
  description?: string;
  price?: string;
  'sale-price'?: string;
  'buy-url'?: string;
  'image-url'?: string;
  [key: string]: unknown;
}

export function mapCJProduct(item: CJProduct): ScrapedProduct {
  const priceStr = item['sale-price'] ?? item.price;
  const price = priceStr ? parseFloat(priceStr) : undefined;

  return {
    externalId: item.sku,
    source: 'cj',
    name: item.name,
    description: item.description,
    price: isNaN(price as number) ? undefined : price,
    commission: undefined, // CJ commission data not in product search response
    imageUrl: item['image-url'],
    rawData: item as Record<string, unknown>,
  };
}
