import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, Sparkles, Loader2, Star, ChevronRight,
  Dna, FileText, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useProduct, useEnrichProduct, useEnrichmentJobStatus, useExtractProductDNA } from '../hooks/useProducts';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { EnrichStatusBadge } from '@shared/ui/EnrichStatusBadge';
import { formatDate, formatProductPrice } from '@shared/utils/format';
import type { ProductDNA } from '@core/api/api.types';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError, refetch } = useProduct(id!);
  const { mutate: enrich, isPending: isEnriching } = useEnrichProduct();
  const { mutate: extractDNA, isPending: isExtractingDNA } = useExtractProductDNA();
  const [jobId, setJobId] = useState<string | null>(null);
  const [dnaExpanded, setDnaExpanded] = useState(true);
  const [showDnaConfirm, setShowDnaConfirm] = useState(false);

  useEnrichmentJobStatus(jobId);

  if (isLoading) return <div className="text-zinc-500 text-sm py-8 text-center">Loading...</div>;
  if (isError || !product) return <div className="text-red-400 text-sm py-8 text-center">Product not found</div>;

  const handleEnrich = () => {
    enrich(product.id, {
      onSuccess: (data) => setJobId(data.jobId),
    });
  };

  const handleExtractDNA = () => {
    if (product.productDna) {
      setShowDnaConfirm(true);
    } else {
      runExtractDNA();
    }
  };

  const runExtractDNA = () => {
    setShowDnaConfirm(false);
    extractDNA(product.id, {
      onSuccess: () => refetch(),
    });
  };

  const enriching = isEnriching || product.enrichStatus === 'ENRICHING';
  const hasNoLink = !product.productLink;
  const canExtractDNA = product.enrichStatus === 'DONE' || !!product.productDna;

  const gallery = product.metadata?.gallery ?? [];
  const videos = product.metadata?.videos ?? [];
  const rating = product.metadata?.rating;
  const reviewCount = product.metadata?.reviewCount;
  const categories = product.metadata?.categories ?? [];

  const dna = product.productDna as ProductDNA | undefined;

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to="/products" className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors">
        <ArrowLeft size={14} /> Back to Products
      </Link>

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white text-xl font-semibold">{product.name}</h2>
            <p className="text-zinc-400 text-sm mt-1 font-mono">{product.externalId}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <StatusBadge status={product.status} />
            <button
              onClick={handleEnrich}
              disabled={enriching || hasNoLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={hasNoLink ? 'No product link — cannot fetch detail' : 'Fetch product detail'}
            >
              {enriching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {enriching ? 'Fetching...' : 'Fetch Detail'}
            </button>
            <button
              onClick={handleExtractDNA}
              disabled={isExtractingDNA || !canExtractDNA}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-700 hover:bg-violet-600 text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={!canExtractDNA ? 'Fetch product detail first' : 'Extract Product DNA using AI'}
            >
              {isExtractingDNA ? <Loader2 size={13} className="animate-spin" /> : <Dna size={13} />}
              {isExtractingDNA ? 'Extracting...' : product.productDna ? 'Re-extract DNA' : 'Extract DNA'}
            </button>
            {product.status === 'ACTIVE' && (
              <button
                onClick={() => navigate(`/content/generate?productId=${product.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-700 hover:bg-green-600 text-sm text-white transition-colors"
              >
                <FileText size={13} />
                Generate Content
              </button>
            )}
          </div>
        </div>

        {/* DNA Confirmation Dialog */}
        {showDnaConfirm && (
          <div className="bg-amber-950 border border-amber-700 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-200 text-sm font-medium">Replace existing DNA?</p>
              <p className="text-amber-400 text-xs mt-1">
                This product already has extracted DNA. Extracting again will replace the existing data. This cannot be undone.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={runExtractDNA}
                  className="px-3 py-1.5 rounded-md bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium transition-colors"
                >
                  Yes, replace DNA
                </button>
                <button
                  onClick={() => setShowDnaConfirm(false)}
                  className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enrich Status */}
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

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Source', value: product.source },
            { label: 'Price', value: product.price != null ? formatProductPrice(product.price, product.source) : '—' },
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

        {/* Categories */}
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

        {/* Affiliate Link */}
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

      {/* Product DNA Panel */}
      {dna && (
        <div className="bg-zinc-800 border border-violet-700/40 rounded-lg overflow-hidden">
          <button
            onClick={() => setDnaExpanded(!dnaExpanded)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Dna size={15} className="text-violet-400" />
              <span className="text-white text-sm font-semibold">Product DNA</span>
              {product.dnaExtractedAt && (
                <span className="text-zinc-500 text-xs">· extracted {formatDate(product.dnaExtractedAt)}</span>
              )}
            </div>
            {dnaExpanded ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
          </button>

          {dnaExpanded && (
            <div className="px-6 pb-6 space-y-5 border-t border-zinc-700/50">

              {/* Core Problem */}
              <div className="pt-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Core Problem Solved</p>
                <p className="text-zinc-200 text-sm">{dna.coreProblem}</p>
              </div>

              {/* Key Features */}
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Key Features</p>
                <div className="space-y-2">
                  {(dna.keyFeatures ?? []).map((f, i) => (
                    <div key={i} className="bg-zinc-900 rounded-md px-3 py-2">
                      <p className="text-violet-300 text-xs font-medium">{f.feature}</p>
                      <p className="text-zinc-400 text-xs mt-0.5">{f.emotionalBenefit}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Persona */}
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Target Persona</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-zinc-900 rounded-md px-3 py-2">
                    <p className="text-zinc-500 text-xs mb-1">Demographics</p>
                    <p className="text-zinc-300 text-xs">{dna.targetPersona.demographics}</p>
                  </div>
                  <div className="bg-zinc-900 rounded-md px-3 py-2">
                    <p className="text-zinc-500 text-xs mb-1">Psychographics</p>
                    <p className="text-zinc-300 text-xs">{dna.targetPersona.psychographics}</p>
                  </div>
                </div>
              </div>

              {/* Objection Handling */}
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Objection Handling</p>
                <div className="space-y-2">
                  {(dna.objectionHandling ?? []).map((o, i) => (
                    <div key={i} className="bg-zinc-900 rounded-md px-3 py-2">
                      <p className="text-red-400 text-xs font-medium">❌ {o.objection}</p>
                      <p className="text-green-400 text-xs mt-1">✓ {o.counter}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Anchors */}
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Visual Anchors</p>
                <div className="flex flex-wrap gap-1.5">
                  {(dna.visualAnchors ?? []).map((anchor, i) => (
                    <span key={i} className="px-2 py-0.5 bg-violet-900/40 border border-violet-700/40 text-violet-300 text-xs rounded">
                      {anchor}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
