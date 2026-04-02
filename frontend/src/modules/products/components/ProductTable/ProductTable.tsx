import { ExternalLink, Trash2, Sparkles, Loader2, Dna, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { formatDate } from '@shared/utils/format';
import type { Product } from '@core/api/api.types';

interface ProductTableProps {
  products: Product[];
  selectedIds?: string[];
  onSelectChange?: (ids: string[]) => void;
  onDelete?: (id: string) => void;
  onEnrich?: (id: string) => void;
  enrichingId?: string | null;
  onExtractDna?: (id: string) => void;
  extractingDnaId?: string | null;
}

export function ProductTable({
  products,
  selectedIds = [],
  onSelectChange,
  onDelete,
  onEnrich,
  enrichingId,
  onExtractDna,
  extractingDnaId,
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <p className="text-sm">No products yet. Phase 2 will add ingestion.</p>
      </div>
    );
  }

  const allSelected = products.length > 0 && products.every((p) => selectedIds.includes(p.id));
  const someSelected = products.some((p) => selectedIds.includes(p.id));

  const toggleAll = () => {
    if (!onSelectChange) return;
    if (allSelected) {
      onSelectChange(selectedIds.filter((id) => !products.find((p) => p.id === id)));
    } else {
      const pageIds = products.map((p) => p.id);
      onSelectChange([...new Set([...selectedIds, ...pageIds])]);
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectChange) return;
    onSelectChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-700">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-800">
            {onSelectChange && (
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                  className="rounded border-zinc-600 bg-zinc-700 text-violet-500 focus:ring-violet-500/30 cursor-pointer"
                />
              </th>
            )}
            {['Name', 'Source', 'Commission', 'Status', 'DNA', 'Created', 'Actions'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-zinc-400 font-medium text-xs uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const isEnriching = enrichingId === product.id || product.enrichStatus === 'ENRICHING';
            const isExtractingDna = extractingDnaId === product.id;
            const hasNoLink = !product.productLink;
            const isSelected = selectedIds.includes(product.id);

            return (
              <tr
                key={product.id}
                className={`border-b border-zinc-700/50 hover:bg-zinc-800/40 transition-colors ${isSelected ? 'bg-violet-500/5' : ''}`}
              >
                {onSelectChange && (
                  <td className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(product.id)}
                      className="rounded border-zinc-600 bg-zinc-700 text-violet-500 focus:ring-violet-500/30 cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-4 py-3 max-w-xs">
                  <Link
                    to={`/products/${product.id}`}
                    className="text-white hover:text-violet-400 font-medium line-clamp-2 leading-snug"
                    title={product.name}
                  >
                    {product.name}
                  </Link>
                  <p className="text-zinc-500 text-xs mt-0.5 font-mono truncate">{product.externalId}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-zinc-300 capitalize">{product.source}</span>
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {product.commission != null ? `${product.commission}%` : '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={product.status} />
                </td>
                <td className="px-4 py-3">
                  {product.productDna ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-violet-500/15 text-violet-400"
                      title={
                        product.dnaExtractedAt
                          ? `Extracted: ${formatDate(product.dnaExtractedAt)}`
                          : 'DNA extracted'
                      }
                    >
                      <Dna size={11} />
                      Ready
                    </span>
                  ) : onExtractDna ? (
                    <button
                      onClick={() => !isExtractingDna && onExtractDna(product.id)}
                      disabled={isExtractingDna}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-zinc-400 hover:text-violet-400 border border-zinc-700 hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Extract DNA from product"
                    >
                      <Dna size={11} />
                      {isExtractingDna ? 'Extracting…' : 'Extract DNA'}
                    </button>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(product.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a
                      href={product.affiliateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                      title="Open affiliate link"
                    >
                      <ExternalLink size={14} />
                    </a>
                    {onEnrich && (
                      <button
                        onClick={() => !isEnriching && !hasNoLink && onEnrich(product.id)}
                        disabled={isEnriching || hasNoLink}
                        className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={hasNoLink ? 'No product link — cannot fetch detail' : 'Fetch product detail'}
                      >
                        {isEnriching ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(product.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                        title="Delete product"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
