import { ProductStatus } from '@prisma/client';

export const PRODUCT_STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  [ProductStatus.PENDING]: [ProductStatus.ACTIVE, ProductStatus.INACTIVE],
  [ProductStatus.ACTIVE]: [ProductStatus.INACTIVE],
  [ProductStatus.INACTIVE]: [ProductStatus.ACTIVE],
};

export function canTransitionStatus(from: ProductStatus, to: ProductStatus): boolean {
  return PRODUCT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
