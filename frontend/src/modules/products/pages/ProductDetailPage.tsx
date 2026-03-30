import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useProduct } from '../hooks/useProducts';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { formatDate, formatCurrency } from '@shared/utils/format';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, isError } = useProduct(id!);

  if (isLoading) return <div className="text-zinc-500 text-sm py-8 text-center">Loading...</div>;
  if (isError || !product) return <div className="text-red-400 text-sm py-8 text-center">Product not found</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to="/products" className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors">
        <ArrowLeft size={14} /> Back to Products
      </Link>

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white text-xl font-semibold">{product.name}</h2>
            <p className="text-zinc-400 text-sm mt-1 font-mono">{product.externalId}</p>
          </div>
          <StatusBadge status={product.status} />
        </div>

        {product.description && (
          <p className="text-zinc-300 text-sm leading-relaxed">{product.description}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Source', value: product.source },
            { label: 'Price', value: product.price != null ? formatCurrency(product.price) : '—' },
            { label: 'Commission', value: product.commission != null ? `${product.commission}%` : '—' },
            { label: 'Created', value: formatDate(product.createdAt) },
            { label: 'Updated', value: formatDate(product.updatedAt) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">{label}</p>
              <p className="text-zinc-200 text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-zinc-700">
          <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Affiliate Link</p>
          <a
            href={product.affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm font-mono break-all"
          >
            {product.affiliateLink}
            <ExternalLink size={12} className="shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
}
