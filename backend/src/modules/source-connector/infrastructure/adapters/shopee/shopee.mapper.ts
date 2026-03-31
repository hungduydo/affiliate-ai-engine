import { ScrapedProduct } from '../../../domain/adapters/source.adapter.interface';

export interface ShopeeOfferItem {
  productId?: string;
  itemId?: string;
  productName?: string;
  name?: string;
  originalPrice?: number;
  price?: number;
  commissionRate?: number;
  commission_rate?: number;
  productLink?: string;
  affiliateLink?: string;
  imageUrl?: string;
  image?: string;
  shopId?: string | number;
  shop_id?: string | number;
  shopid?: string | number;
  [key: string]: unknown;
}

export function mapShopeeItem(item: ShopeeOfferItem): ScrapedProduct {
  const productId = String(item.productId ?? item.itemId ?? '');
  const name = item.productName ?? item.name ?? '';
  const price = item.originalPrice ?? item.price;
  const commissionRate = item.commissionRate ?? item.commission_rate;
  const imageUrl = item.imageUrl ?? item.image;
  const affiliateLink = item.affiliateLink ?? item.productLink;

  // Build direct product link for enrichment crawling
  const shopId = item.shopId ?? item.shop_id ?? item.shopid;
  const productLink =
    shopId && productId
      ? `https://shopee.vn/product/${shopId}/${productId}`
      : typeof item.productLink === 'string'
        ? item.productLink
        : undefined;

  return {
    externalId: productId,
    source: 'shopee',
    name,
    price: typeof price === 'number' ? price / 100 : undefined, // Shopee prices in cents
    commission: typeof commissionRate === 'number' ? commissionRate * 100 : undefined, // Convert to %
    imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
    affiliateLink: typeof affiliateLink === 'string' ? affiliateLink : undefined,
    productLink,
    rawData: item as Record<string, unknown>,
  };
}
