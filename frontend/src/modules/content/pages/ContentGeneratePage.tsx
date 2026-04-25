import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Sparkles, Loader2, Search, Package, X,
  Globe, ShoppingBag, Users, Camera, Send, Briefcase, Music2, PlayCircle,
  Pin, MessageCircle, AtSign,
  FileText, MessageSquare, Video, Layers, AlignLeft, LayoutTemplate,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contentService } from '../services/content.service';
import { productsService } from '@modules/products/services/products.service';
import { JobStatusCard } from '@modules/products/components/JobStatusCard';
import { PLATFORMS, PLATFORM_LABELS, PLATFORM_CONTENT_TYPES } from '@core/api/api.types';
import type { Platform, ContentType, Product } from '@core/api/api.types';
import { cn } from '@shared/utils/cn';

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  BLOG_POST: 'Blog Post',
  SOCIAL_POST: 'Social Post',
  VIDEO_SCRIPT: 'Video Script',
  CAROUSEL: 'Carousel',
  THREAD: 'Thread',
  HERO_COPY: 'Hero Copy',
};

const CONTENT_TYPE_ICONS: Record<ContentType, typeof FileText> = {
  BLOG_POST: FileText,
  SOCIAL_POST: MessageSquare,
  VIDEO_SCRIPT: Video,
  CAROUSEL: Layers,
  THREAD: AlignLeft,
  HERO_COPY: LayoutTemplate,
};

const PLATFORM_ICONS: Record<Platform, typeof Globe> = {
  WORDPRESS: Globe,
  SHOPIFY: ShoppingBag,
  FACEBOOK: Users,
  INSTAGRAM: Camera,
  TWITTER: Send,
  LINKEDIN: Briefcase,
  TIKTOK: Music2,
  YOUTUBE: PlayCircle,
  PINTEREST: Pin,
  MASTODON: MessageCircle,
  THREADS: AtSign,
};

export function ContentGeneratePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedProductId = searchParams.get('productId') ?? '';

  const [productId, setProductId] = useState(preselectedProductId);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pickerOpen, setPickerOpen] = useState(!preselectedProductId);
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [platform, setPlatform] = useState<Platform>('WORDPRESS');
  const [contentType, setContentType] = useState<ContentType>('BLOG_POST');
  const [jobId, setJobId] = useState<string | null>(null);
  const [contentId, setContentId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(productSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [productSearch]);

  // Resolve pre-selected product (from ?productId= deeplink)
  const { data: preselectedProduct } = useQuery({
    queryKey: ['products', preselectedProductId],
    queryFn: () => productsService.getById(preselectedProductId),
    enabled: !!preselectedProductId && !selectedProduct,
  });
  useEffect(() => {
    if (preselectedProduct && !selectedProduct) setSelectedProduct(preselectedProduct);
  }, [preselectedProduct, selectedProduct]);

  // Picker results — recent ACTIVE products when query is empty, search otherwise
  const { data: pickerData, isLoading: pickerLoading } = useQuery({
    queryKey: ['products-picker', debouncedSearch],
    queryFn: () =>
      productsService.getMany(
        debouncedSearch
          ? { search: debouncedSearch, limit: 20 }
          : { status: 'ACTIVE', limit: 10 },
      ),
    enabled: pickerOpen,
  });

  // Auto-pick first valid content type when platform changes
  useEffect(() => {
    const allowed = PLATFORM_CONTENT_TYPES[platform];
    if (!allowed.includes(contentType)) setContentType(allowed[0]);
  }, [platform, contentType]);

  // Close picker when clicking outside
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pickerOpen) return;
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        if (selectedProduct) setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [pickerOpen, selectedProduct]);

  // Poll generated content once job completes
  const { data: generatedContent } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => contentService.getById(contentId!),
    enabled: !!contentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'GENERATED' || status === 'FAILED') return false;
      return 3000;
    },
  });

  const mutation = useMutation({
    mutationFn: contentService.generate,
    onSuccess: (data) => {
      setJobId(data.jobId);
      setContentId(data.contentId);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
    setJobId(null);
    setContentId(null);
    mutation.mutate({ productId, platform, contentType });
  }

  function handlePickProduct(p: Product) {
    setSelectedProduct(p);
    setProductId(p.id);
    setPickerOpen(false);
    setProductSearch('');
  }

  function handleChangeProduct() {
    setPickerOpen(true);
  }

  const isGenerated = generatedContent?.status === 'GENERATED';
  const allowedContentTypes = PLATFORM_CONTENT_TYPES[platform];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/content')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Content
        </button>
        <div>
          <h1 className="text-xl font-semibold text-white">Generate Content</h1>
          <p className="text-sm text-zinc-400">Use Gemini AI to create platform-specific affiliate content</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 space-y-6">
        {/* Product selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Product</label>

          {selectedProduct && !pickerOpen ? (
            <SelectedProductCard product={selectedProduct} onChange={handleChangeProduct} />
          ) : (
            <div ref={pickerRef} className="rounded-md border border-zinc-700 bg-zinc-900 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search products by name…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                />
                {selectedProduct && (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {pickerLoading && (
                  <div className="px-3 py-6 text-center text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Loading…
                  </div>
                )}
                {!pickerLoading && pickerData && pickerData.data.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-zinc-500">
                    {debouncedSearch ? 'No products match' : 'No active products yet'}
                  </div>
                )}
                {!pickerLoading && pickerData && pickerData.data.length > 0 && (
                  <>
                    {!debouncedSearch && (
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-zinc-500 bg-zinc-950/50">
                        Recent active products
                      </div>
                    )}
                    <ul className="divide-y divide-zinc-800">
                      {pickerData.data.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => handlePickProduct(p)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/60 transition-colors"
                          >
                            <ProductThumb url={p.imageUrl} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white font-medium truncate">{p.name}</div>
                              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">{p.source}</span>
                                {p.price != null && <span>${p.price.toFixed(2)}</span>}
                                {p.commission != null && (
                                  <span className="text-emerald-500">{p.commission}% comm.</span>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Platform tile grid */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Platform</label>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {/* Website tile (covers both WordPress + Shopify; platform value is WORDPRESS) */}
            {(() => {
              const isWebsite = platform === 'WORDPRESS' || platform === 'SHOPIFY';
              return (
                <button
                  type="button"
                  onClick={() => setPlatform('WORDPRESS')}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-md border px-2 py-3 text-xs transition-colors',
                    isWebsite
                      ? 'border-violet-500 bg-violet-500/10 text-white ring-1 ring-violet-500'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white',
                  )}
                >
                  <Globe className={cn('h-5 w-5', isWebsite ? 'text-violet-400' : 'text-zinc-500')} />
                  <span>Website</span>
                </button>
              );
            })()}
            {PLATFORMS.filter((p) => p !== 'WORDPRESS' && p !== 'SHOPIFY').map((p) => {
              const Icon = PLATFORM_ICONS[p];
              const active = platform === p;
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-md border px-2 py-3 text-xs transition-colors',
                    active
                      ? 'border-violet-500 bg-violet-500/10 text-white ring-1 ring-violet-500'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white',
                  )}
                >
                  <Icon className={cn('h-5 w-5', active ? 'text-violet-400' : 'text-zinc-500')} />
                  <span className="truncate max-w-full">{PLATFORM_LABELS[p]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Type chips (filtered by platform) */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Content Type</label>
          <div className="flex flex-wrap gap-2">
            {allowedContentTypes.map((t) => {
              const Icon = CONTENT_TYPE_ICONS[t];
              const active = contentType === t;
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => setContentType(t)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'border-violet-500 bg-violet-500/10 text-white'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {CONTENT_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={!productId || mutation.isPending}
          className="flex items-center gap-2 rounded-md bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Content
        </button>

        {mutation.isError && (
          <p className="text-sm text-red-400">
            {mutation.error instanceof Error ? mutation.error.message : 'Generation failed'}
          </p>
        )}
      </form>

      {/* Job progress */}
      {jobId && !isGenerated && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-sm font-medium text-zinc-300 mb-3">Generation Progress</h2>
          <JobStatusCard jobId={jobId} />
        </div>
      )}

      {/* Generated result */}
      {isGenerated && generatedContent && (
        <div className="rounded-lg border border-emerald-900/40 bg-zinc-950 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Content Generated
            </h2>
            <button
              onClick={() => {
                contentService.updateStatus(generatedContent.id, 'PENDING_APPROVAL');
                queryClient.invalidateQueries({ queryKey: ['content'] });
                navigate('/content');
              }}
              className="text-xs rounded bg-emerald-700 px-3 py-1.5 text-white hover:bg-emerald-600 transition-colors"
            >
              Approve & Queue for Publishing
            </button>
          </div>

          {generatedContent.title && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Title</p>
              <p className="text-white font-medium">{generatedContent.title}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Body</p>
            <div className="bg-zinc-900 rounded p-3 text-sm text-zinc-300 whitespace-pre-wrap max-h-80 overflow-y-auto">
              {generatedContent.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductThumb({ url }: { url?: string }) {
  if (!url) {
    return (
      <div className="h-10 w-10 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
        <Package className="h-4 w-4 text-zinc-500" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className="h-10 w-10 rounded object-cover bg-zinc-800 flex-shrink-0"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
    />
  );
}

function SelectedProductCard({ product, onChange }: { product: Product; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-900 p-3">
      <ProductThumb url={product.imageUrl} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white font-medium truncate">{product.name}</div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">{product.source}</span>
          {product.price != null && <span>${product.price.toFixed(2)}</span>}
          {product.commission != null && (
            <span className="text-emerald-500">{product.commission}% comm.</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="text-xs rounded border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
      >
        Change
      </button>
    </div>
  );
}
