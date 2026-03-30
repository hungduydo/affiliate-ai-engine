import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService, type ProductFilter } from '../services/products.service';
import type { ProductStatus } from '@core/api/api.types';

const PRODUCTS_KEY = 'products';

export function useProducts(filter: ProductFilter = {}) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, filter],
    queryFn: () => productsService.getMany(filter),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, id],
    queryFn: () => productsService.getById(id),
    enabled: !!id,
  });
}

export function useUpdateProductStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      productsService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] }),
  });
}
