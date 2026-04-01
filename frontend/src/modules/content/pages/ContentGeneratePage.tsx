import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contentService } from '../services/content.service';
import { productsService } from '@modules/products/services/products.service';
import { JobStatusCard } from '@modules/products/components/JobStatusCard';
import type { Platform, ContentType } from '@core/api/api.types';

const PLATFORMS: Platform[] = ['WORDPRESS', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'SHOPIFY'];

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  BLOG_POST: 'Blog Post',
  SOCIAL_POST: 'Social Post',
  VIDEO_SCRIPT: 'Video Script',
  CAROUSEL: 'Carousel (Slides)',
  THREAD: 'Thread (X / Twitter)',
  HERO_COPY: 'Hero Copy (Website)',
};
const CONTENT_TYPES = Object.keys(CONTENT_TYPE_LABELS) as ContentType[];

export function ContentGeneratePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedProductId = searchParams.get('productId') ?? '';

  const [productSearch, setProductSearch] = useState('');
  const [productId, setProductId] = useState(preselectedProductId);
  const [platform, setPlatform] = useState<Platform>('WORDPRESS');
  const [contentType, setContentType] = useState<ContentType>('BLOG_POST');
  const [jobId, setJobId] = useState<string | null>(null);
  const [contentId, setContentId] = useState<string | null>(null);

  // Load pre-selected product name when navigating from product detail
  const { data: preselectedProduct } = useQuery({
    queryKey: ['products', preselectedProductId],
    queryFn: () => productsService.getById(preselectedProductId),
    enabled: !!preselectedProductId,
  });

  useEffect(() => {
    if (preselectedProduct && !productSearch) {
      setProductSearch(preselectedProduct.name);
    }
  }, [preselectedProduct, productSearch]);

  const { data: productsData } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsService.getMany({ search: productSearch, limit: 20 }),
    enabled: productSearch.length >= 2 && !productId,
  });

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

  const isGenerated = generatedContent?.status === 'GENERATED';

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

      <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 space-y-5">
        {/* Product selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Product</label>
          <input
            type="text"
            placeholder="Search products by name…"
            value={productSearch}
            onChange={(e) => { setProductSearch(e.target.value); setProductId(''); }}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          {productsData && productsData.data.length > 0 && !productId && productSearch.length >= 2 && (
            <div className="rounded-md border border-zinc-700 bg-zinc-900 divide-y divide-zinc-800 max-h-40 overflow-y-auto">
              {productsData.data.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setProductId(p.id); setProductSearch(p.name); }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-2 text-zinc-500 text-xs">{p.source}</span>
                </button>
              ))}
            </div>
          )}
          {productId && (
            <p className="text-xs text-emerald-400">✓ Product selected</p>
          )}
        </div>

        {/* Platform + ContentType */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {CONTENT_TYPES.map((t) => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>)}
            </select>
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
