import { useState } from 'react';
import { Search, Upload, AlertTriangle, Sparkles, Dna, FileText, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProducts, useDeleteProduct, useEnrichProduct, useEnrichBatch, useExtractProductDNA } from '../hooks/useProducts';
import { ProductTable } from '../components/ProductTable/ProductTable';
import type { ProductStatus } from '@core/api/api.types';

export function ProductListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [page, setPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data, isLoading, isError } = useProducts({ search, status: status || undefined, page, limit: 20 });
  const { mutate: deleteProduct } = useDeleteProduct();
  const { mutate: enrichProduct, isPending: isEnriching, variables: enrichingId } = useEnrichProduct();
  const { mutate: enrichBatch } = useEnrichBatch();
  const { mutate: extractDna, isPending: isExtractingDna, variables: extractingDnaId } = useExtractProductDNA();

  const handleDeleteConfirmed = () => {
    if (deleteConfirmId) {
      deleteProduct(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => deleteProduct(id));
    setSelectedIds([]);
    setBulkDeleteConfirm(false);
  };

  const handleBulkEnrich = () => {
    enrichBatch(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkExtractDna = () => {
    selectedIds.forEach((id) => extractDna(id));
    setSelectedIds([]);
  };

  const handleBulkGenerateContent = () => {
    const target =
      selectedIds.length === 1
        ? `/content/generate?productId=${selectedIds[0]}`
        : '/content/generate';
    setSelectedIds([]);
    navigate(target);
  };

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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md pl-9 pr-3 py-2 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ProductStatus | '');
            setPage(1);
          }}
          className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-violet-500"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="ENRICHED">Enriched</option>
          <option value="RAW">Raw</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg">
          <span className="text-sm text-zinc-300 font-medium">{selectedIds.length} selected</span>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <button
              onClick={handleBulkEnrich}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-700/50 hover:bg-zinc-700 rounded-md transition-colors"
            >
              <Sparkles size={12} />
              Fetch Detail
            </button>
            <button
              onClick={handleBulkExtractDna}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-700/50 hover:bg-zinc-700 rounded-md transition-colors"
            >
              <Dna size={12} />
              Extract DNA
            </button>
            <button
              onClick={handleBulkGenerateContent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-700/50 hover:bg-zinc-700 rounded-md transition-colors"
            >
              <FileText size={12} />
              Generate Content
            </button>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
          <button
            onClick={() => setSelectedIds([])}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
            title="Clear selection"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Loading...</div>
      ) : isError ? (
        <div className="text-red-400 text-sm py-8 text-center">Failed to load products</div>
      ) : (
        <>
          <ProductTable
            products={data?.data ?? []}
            selectedIds={selectedIds}
            onSelectChange={setSelectedIds}
            onDelete={(id) => setDeleteConfirmId(id)}
            onEnrich={(id) => enrichProduct(id)}
            enrichingId={isEnriching ? (enrichingId ?? null) : null}
            onExtractDna={(id) => extractDna(id)}
            extractingDnaId={isExtractingDna ? (extractingDnaId ?? null) : null}
          />

          {/* Single delete confirmation */}
          {deleteConfirmId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-sm space-y-4 shadow-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium text-sm">Delete product?</p>
                    <p className="text-zinc-400 text-xs mt-1">This action cannot be undone.</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirmed}
                    className="px-3 py-1.5 rounded-md bg-red-700 hover:bg-red-600 text-white text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk delete confirmation */}
          {bulkDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-sm space-y-4 shadow-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium text-sm">
                      Delete {selectedIds.length} products?
                    </p>
                    <p className="text-zinc-400 text-xs mt-1">This action cannot be undone.</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setBulkDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 rounded-md bg-red-700 hover:bg-red-600 text-white text-sm transition-colors"
                  >
                    Delete {selectedIds.length}
                  </button>
                </div>
              </div>
            </div>
          )}

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
