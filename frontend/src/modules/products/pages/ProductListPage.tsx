import { useState } from 'react';
import { Search, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProducts, useDeleteProduct, useEnrichProduct } from '../hooks/useProducts';
import { ProductTable } from '../components/ProductTable/ProductTable';
import type { ProductStatus } from '@core/api/api.types';

export function ProductListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useProducts({ search, status: status || undefined, page, limit: 20 });
  const { mutate: deleteProduct } = useDeleteProduct();
  const { mutate: enrichProduct, isPending: isEnriching, variables: enrichingId } = useEnrichProduct();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-semibold">Products</h2>
          <p className="text-zinc-400 text-sm mt-0.5">
            {data ? `${data.total} products` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={() => navigate('/products/import')}
          className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Import Products
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md pl-9 pr-3 py-2 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as ProductStatus | ''); setPage(1); }}
          className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-violet-500"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Loading...</div>
      ) : isError ? (
        <div className="text-red-400 text-sm py-8 text-center">Failed to load products</div>
      ) : (
        <>
          <ProductTable
            products={data?.data ?? []}
            onDelete={(id) => deleteProduct(id)}
            onEnrich={(id) => enrichProduct(id)}
            enrichingId={isEnriching ? (enrichingId ?? null) : null}
          />
          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>Page {page} of {data.totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded disabled:opacity-40 hover:bg-zinc-700 text-white"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded disabled:opacity-40 hover:bg-zinc-700 text-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
