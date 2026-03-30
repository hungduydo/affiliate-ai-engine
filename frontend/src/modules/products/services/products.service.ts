import { apiClient } from '@core/api/api-client';
import type { Product, PaginatedResult, ProductStatus } from '@core/api/api.types';

export interface ProductFilter {
  page?: number;
  limit?: number;
  source?: string;
  status?: ProductStatus;
  search?: string;
}

export const productsService = {
  getMany: (filter: ProductFilter = {}) =>
    apiClient.get<PaginatedResult<Product>>('/products', { params: filter }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Product>(`/products/${id}`).then((r) => r.data),

  create: (data: Partial<Product>) =>
    apiClient.post<Product>('/products', data).then((r) => r.data),

  updateStatus: (id: string, status: ProductStatus) =>
    apiClient.put<Product>(`/products/${id}/status`, { status }).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/products/${id}`),
};
