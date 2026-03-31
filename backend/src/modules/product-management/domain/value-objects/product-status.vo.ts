import { ProductStatus } from '@prisma-client/product-management';

export const PRODUCT_STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  [ProductStatus.RAW]: [ProductStatus.ENRICHED, ProductStatus.INACTIVE],
  [ProductStatus.ENRICHED]: [ProductStatus.ACTIVE, ProductStatus.INACTIVE],
  [ProductStatus.ACTIVE]: [ProductStatus.INACTIVE],
  [ProductStatus.INACTIVE]: [ProductStatus.RAW],
};

export function canTransitionStatus(from: ProductStatus, to: ProductStatus): boolean {
  return PRODUCT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
