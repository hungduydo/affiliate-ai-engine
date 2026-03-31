import { ExternalLink, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { EnrichStatusBadge } from '@shared/ui/EnrichStatusBadge';
import { formatDate } from '@shared/utils/format';
import type { Product } from '@core/api/api.types';

interface ProductTableProps {
  products: Product[];
  onDelete?: (id: string) => void;
  onEnrich?: (id: string) => void;
  enrichingId?: string | null;
}

export function ProductTable({ products, onDelete, onEnrich, enrichingId }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <p className="text-sm">No products yet. Phase 2 will add ingestion.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-800">
            {['Name', 'Source', 'Commission', 'Status', 'Detail', 'Created', 'Actions'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-zinc-400 font-medium text-xs uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const isEnriching = enrichingId === product.id || product.enrichStatus === 'ENRICHING';
            const hasNoLink = !product.productLink;

            return (
              <tr
                key={product.id}
                className="border-b border-zinc-700/50 hover:bg-zinc-800/40 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link to={`/products/${product.id}`} className="text-white hover:text-violet-400 font-medium">
                    {product.name}
                  </Link>
                  <p className="text-zinc-500 text-xs mt-0.5 font-mono">{product.externalId}</p>
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
                  <EnrichStatusBadge status={product.enrichStatus ?? 'PENDING'} />
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {formatDate(product.createdAt)}
                </td>
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
                        {isEnriching
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Sparkles size={14} />
                        }
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(product.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                        title="Delete product"
                      >
                        <Trash2 size={14} />
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
