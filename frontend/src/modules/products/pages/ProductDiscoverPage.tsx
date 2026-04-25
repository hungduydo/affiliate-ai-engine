import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Copy, Check, Zap, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '@shared/utils/cn';
import { discoverService } from '../services/discover.service';
import { settingsService } from '../../settings/services/settings.service';
import type { DiscoverProduct, Platform, ContentType } from '@core/api/api.types';
import { PLATFORMS, PLATFORM_LABELS } from '@core/api/api.types';

const CONTENT_TYPES: ContentType[] = ['BLOG_POST', 'SOCIAL_POST', 'VIDEO_SCRIPT'];
const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  BLOG_POST: 'Blog Post',
  SOCIAL_POST: 'Social Post',
  VIDEO_SCRIPT: 'Video Script',
  CAROUSEL: 'Carousel',
  THREAD: 'Thread',
  HERO_COPY: 'Hero Copy',
};

const CATEGORY_TABS = ['All', 'Health', 'Software', 'Finance', 'Education', 'E-commerce'] as const;
type CategoryTab = (typeof CATEGORY_TABS)[number];

function formatTimeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-zinc-700 rounded w-3/4 mb-3" />
      <div className="h-3 bg-zinc-800 rounded w-full mb-2" />
      <div className="h-3 bg-zinc-800 rounded w-2/3 mb-4" />
      <div className="flex gap-3">
        <div className="h-8 bg-zinc-800 rounded flex-1" />
        <div className="h-8 bg-zinc-800 rounded flex-1" />
        <div className="h-8 bg-zinc-800 rounded flex-1" />
      </div>
    </div>
  );
}

interface ImportModalProps {
  product: DiscoverProduct;
  onClose: () => void;
  onConfirm: (platform: Platform, contentType: ContentType) => void;
  loading: boolean;
}

function ImportModal({ product, onClose, onConfirm, loading }: ImportModalProps) {
  const prefs = discoverService.getLastPlatformPrefs();
  const [platform, setPlatform] = useState<Platform>(prefs?.platform ?? 'WORDPRESS');
  const [contentType, setContentType] = useState<ContentType>(prefs?.contentType ?? 'BLOG_POST');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-1">Import & Generate</h3>
        <p className="text-zinc-400 text-sm mb-5 line-clamp-2">{product.name}</p>

        <div className="space-y-4">
          <div>
            <label className="text-zinc-400 text-xs mb-1.5 block">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-1.5 block">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(platform, contentType)}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Import & Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: DiscoverProduct;
  rank: number;
  onImport: (product: DiscoverProduct) => void;
}

function ProductCard({ product, rank, onImport }: ProductCardProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(product.affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 size-5 rounded bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center font-mono">
            {rank}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 shrink-0">CJ</span>
          {product.imported && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0">Imported</span>
          )}
        </div>
        <button onClick={copyLink} className="shrink-0 p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" title="Copy affiliate link">
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>

      {/* Name + description */}
      <div>
        <p className="text-white text-sm font-medium line-clamp-1">{product.name}</p>
        <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{product.description}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-800/60 rounded p-2">
          <p className="text-zinc-500 text-xs">EPC</p>
          <p className="text-white text-sm font-medium">${product.epc.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-800/60 rounded p-2">
          <p className="text-zinc-500 text-xs">Commission</p>
          <p className="text-white text-sm font-medium">{(product.commission * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-zinc-800/60 rounded p-2">
          <p className="text-zinc-500 text-xs">Price</p>
          <p className="text-white text-sm font-medium">${product.price.toFixed(0)}</p>
        </div>
      </div>

      <p className="text-zinc-600 text-xs truncate">{product.advertiserName}</p>

      {/* CTA */}
      <button
        onClick={() => onImport(product)}
        disabled={product.imported}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          product.imported
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            : 'bg-violet-600 hover:bg-violet-500 text-white',
        )}
      >
        <Zap size={14} />
        {product.imported ? 'Already imported' : 'Import & Generate'}
      </button>
    </div>
  );
}

export function ProductDiscoverPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CategoryTab>('All');
  const [importTarget, setImportTarget] = useState<DiscoverProduct | null>(null);
  const [isForcing, setIsForcing] = useState(false);

  // Check CJ connector status
  const { data: connectorStatus } = useQuery({
    queryKey: ['connector-status'],
    queryFn: () => settingsService.getConnectorStatus(),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['discover-products'],
    queryFn: () => discoverService.getProducts(false),
    enabled: connectorStatus?.cj !== false,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const ingestMutation = useMutation({
    mutationFn: ({ product, platform, contentType }: { product: DiscoverProduct; platform: Platform; contentType: ContentType }) =>
      discoverService.ingestDiscover(product, platform, contentType),
    onSuccess: (result) => {
      discoverService.saveLastPlatformPrefs({ platform: importTarget!.platform as Platform, contentType: importTarget!.category as ContentType });
      setImportTarget(null);
      queryClient.invalidateQueries({ queryKey: ['discover-products'] });
      navigate(`/content/${result.contentId}`);
    },
  });

  const handleForceRefresh = useCallback(async () => {
    setIsForcing(true);
    try {
      const fresh = await discoverService.getProducts(true);
      queryClient.setQueryData(['discover-products'], fresh);
    } finally {
      setIsForcing(false);
    }
  }, [queryClient]);

  const handleConfirmImport = (platform: Platform, contentType: ContentType) => {
    if (!importTarget) return;
    discoverService.saveLastPlatformPrefs({ platform, contentType });
    ingestMutation.mutate({ product: importTarget, platform, contentType });
  };

  // CJ not connected
  if (connectorStatus && !connectorStatus.cj) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-4">
        <ExternalLink size={40} className="text-zinc-600" />
        <div>
          <p className="text-white font-medium mb-1">CJ Affiliate not connected</p>
          <p className="text-zinc-500 text-sm">Add your CJ API credentials to start discovering products.</p>
        </div>
        <button onClick={() => navigate('/settings')} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm transition-colors">
          Go to Settings
        </button>
      </div>
    );
  }

  // Filtered products
  const allProducts = data?.products ?? [];
  const filtered = activeTab === 'All'
    ? allProducts
    : allProducts.filter((p) => p.category.toLowerCase().includes(activeTab.toLowerCase()));

  // Error states
  const getErrorMessage = () => {
    if (!error) return null;
    const err = error as any;
    const status = err.response?.status ?? err.status;
    if (status === 401 || status === 403) return 'CJ API credentials invalid — update token in Settings → Connectors';
    if (status === 429) return 'CJ rate limit hit — wait ~60s and try again';
    if (status === 503) return 'CJ API unavailable — try again later';
    return 'Failed to load products — try again';
  };

  const errorMsg = getErrorMessage();

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">Discover Products</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Top CJ affiliate products ranked by EPC × commission</p>
        </div>
        <button
          onClick={handleForceRefresh}
          disabled={isLoading || isForcing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={cn(isForcing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      {data && (
        <div className="flex items-center gap-4 text-sm text-zinc-500 flex-wrap">
          <span className="text-zinc-300">{allProducts.length} products</span>
          <span>·</span>
          <span className="text-emerald-400">CJ Affiliate connected</span>
          <span>·</span>
          <span>Ranked by EPC × commission</span>
          <span>·</span>
          <span>Last updated: {formatTimeAgo(data.updatedAt)}</span>
          {data.cached && <span className="text-zinc-600">(cached)</span>}
        </div>
      )}

      {/* Partial warning */}
      {data?.partial && data.failedAdvertisers && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          <AlertTriangle size={14} />
          Showing results from {allProducts.length > 0 ? data.failedAdvertisers.length < 5 ? (5 - data.failedAdvertisers.length) : 1 : 0}/5 advertisers. {data.failedAdvertisers.length} timed out.
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle size={14} />
          {errorMsg}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-colors',
              activeTab === tab ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : data?.warningCode === 'NO_JOINED_ADVERTISERS' ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <p className="text-white font-medium">No joined CJ advertisers found</p>
          <p className="text-zinc-500 text-sm">Join affiliate programs at CJ first, then come back here.</p>
        </div>
      ) : filtered.length === 0 && !errorMsg ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <p className="text-white font-medium">No top-rated {activeTab !== 'All' ? activeTab : ''} products right now</p>
          {activeTab !== 'All' && (
            <button onClick={() => setActiveTab('All')} className="text-violet-400 hover:text-violet-300 text-sm">
              Try &lsquo;All&rsquo;
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {filtered.map((product, i) => (
            <ProductCard key={product.externalId} product={product} rank={i + 1} onImport={setImportTarget} />
          ))}
        </div>
      )}

      {/* Import modal */}
      {importTarget && (
        <ImportModal
          product={importTarget}
          onClose={() => setImportTarget(null)}
          onConfirm={handleConfirmImport}
          loading={ingestMutation.isPending}
        />
      )}

      {/* Mutation error */}
      {ingestMutation.isError && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-lg bg-red-500/90 text-white text-sm shadow-lg">
          Import failed — {(ingestMutation.error as any)?.message ?? 'Unknown error'}
        </div>
      )}
    </div>
  );
}
