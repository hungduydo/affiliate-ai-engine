import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Sparkles, Loader2, Star, ChevronRight } from 'lucide-react';
import { useProduct, useEnrichProduct, useEnrichmentJobStatus } from '../hooks/useProducts';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { EnrichStatusBadge } from '@shared/ui/EnrichStatusBadge';
import { formatDate, formatCurrency } from '@shared/utils/format';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, isError } = useProduct(id!);
  const { mutate: enrich, isPending: isEnriching, data: enrichJobData } = useEnrichProduct();
  const [jobId, setJobId] = useState<string | null>(null);

  useEnrichmentJobStatus(jobId);

  if (isLoading) return <div className="text-zinc-500 text-sm py-8 text-center">Loading...</div>;
  if (isError || !product) return <div className="text-red-400 text-sm py-8 text-center">Product not found</div>;

  const handleEnrich = () => {
    enrich(product.id, {
      onSuccess: (data) => setJobId(data.jobId),
    });
  };

  const enriching = isEnriching || product.enrichStatus === 'ENRICHING';
  const hasNoLink = !product.productLink;

  const gallery = product.metadata?.gallery ?? [];
  const videos = product.metadata?.videos ?? [];
  const rating = product.metadata?.rating;
  const reviewCount = product.metadata?.reviewCount;
  const categories = product.metadata?.categories ?? [];

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
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={product.status} />
            <button
              onClick={handleEnrich}
              disabled={enriching || hasNoLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={hasNoLink ? 'No product link — cannot fetch detail' : 'Fetch product detail'}
            >
              {enriching
                ? <Loader2 size={13} className="animate-spin" />
                : <Sparkles size={13} />
              }
              {enriching ? 'Fetching...' : 'Fetch Detail'}
            </button>
          </div>
        </div>

        {product.enrichStatus && (
          <div className="flex items-center gap-2">
            <EnrichStatusBadge status={product.enrichStatus} />
            {product.enrichedAt && (
              <span className="text-zinc-500 text-xs">Last enriched {formatDate(product.enrichedAt)}</span>
            )}
          </div>
        )}

        {product.description && (
          <p className="text-zinc-300 text-sm leading-relaxed">{product.description}</p>
        )}

        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="rounded-md max-h-48 object-contain bg-zinc-900"
          />
        )}

        {/* Image gallery */}
        {gallery.length > 0 && (
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Gallery</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((img, i) => (
                <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <img
                    src={img.url}
                    alt=""
                    className="h-20 w-20 object-cover rounded border border-zinc-700 hover:border-violet-500 transition-colors"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {videos.length > 0 && (
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Videos</p>
            <div className="flex flex-col gap-2">
              {videos.map((v, i) => (
                <a
                  key={i}
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ChevronRight size={14} />
                  {v.thumbnailUrl ? (
                    <img src={v.thumbnailUrl} alt="" className="h-10 w-16 object-cover rounded border border-zinc-700" />
                  ) : (
                    <span className="font-mono text-xs">Video {i + 1}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Source', value: product.source },
            { label: 'Price', value: product.price != null ? formatCurrency(product.price) : '—' },
            { label: 'Commission', value: product.commission != null ? `${product.commission}%` : '—' },
            ...(rating != null ? [{ label: 'Rating', value: (
              <span className="flex items-center gap-1">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                {rating.toFixed(1)}{reviewCount != null ? ` (${reviewCount.toLocaleString()})` : ''}
              </span>
            ) }] : []),
            { label: 'Created', value: formatDate(product.createdAt) },
            { label: 'Updated', value: formatDate(product.updatedAt) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">{label}</p>
              <p className="text-zinc-200 text-sm font-medium">{value as string}</p>
            </div>
          ))}
        </div>

        {categories.length > 0 && (
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Categories</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <span key={cat} className="px-2 py-0.5 bg-zinc-700 text-zinc-300 text-xs rounded">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

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
