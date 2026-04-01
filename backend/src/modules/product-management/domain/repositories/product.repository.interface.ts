import { PaginatedResult, PaginationQuery } from '@shared/types/common.types';
import { ProductEntity } from '../entities/product.entity';
import { ProductStatus } from '@prisma-client/product-management';

export interface ProductFilter extends PaginationQuery {
  source?: string;
  status?: ProductStatus;
  search?: string;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface IProductRepository {
  findById(id: string): Promise<ProductEntity | null>;
  findByExternalId(externalId: string): Promise<ProductEntity | null>;
  findMany(filter: ProductFilter): Promise<PaginatedResult<ProductEntity>>;
  create(data: Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductEntity>;
  update(id: string, data: Partial<ProductEntity>): Promise<ProductEntity>;
  delete(id: string): Promise<void>;
}
