import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService, type ProductFilter } from '../services/products.service';
import { importService } from '../services/import.service';
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

export function useEnrichProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => importService.enrichProduct(productId),
    onSuccess: (_data, productId) => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY, productId] });
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

export function useEnrichmentJobStatus(jobId: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['enrich-job', jobId],
    queryFn: () => importService.getJobStatus(jobId!, 'product-enrichment'),
    enabled: !!jobId,
    refetchInterval: (q) =>
      ['completed', 'failed'].includes(q.state.data?.state ?? '') ? false : 2000,
  });

  useEffect(() => {
    if (query.data?.state === 'completed') {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    }
  }, [query.data?.state, qc]);

  return query;
}
