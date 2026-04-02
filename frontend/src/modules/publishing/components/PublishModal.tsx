import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publishingService } from '../services/publishing.service';
import { apiClient } from '@core/api/api-client';
import { PLATFORMS, PLATFORM_LABELS } from '@core/api/api.types';
import type { Platform, Product, Content, PublishAsset } from '@core/api/api.types';
import { Send, Loader2, Clock, ImageIcon, X } from 'lucide-react';

interface PublishModalProps {
  /** Pre-fill with a specific content ID. If omitted the user types one in. */
  contentId?: string;
  onClose: () => void;
}

export function PublishModal({ contentId: initialContentId, onClose }: PublishModalProps) {
  const queryClient = useQueryClient();

  const [contentId, setContentId] = useState(initialContentId ?? '');
  const [platform, setPlatform] = useState<Platform>('FACEBOOK');
  const [providerId, setProviderId] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<PublishAsset[]>([]);

  // Fetch content info (to get productId for gallery)
  const { data: content } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => apiClient.get<Content>(`/content/${contentId}`).then((r) => r.data),
    enabled: contentId.trim().length > 5,
    retry: false,
  });

  // Fetch product gallery for asset selection
  const { data: product } = useQuery({
    queryKey: ['product', content?.productId],
    queryFn: () => apiClient.get<Product>(`/products/${content!.productId}`).then((r) => r.data),
    enabled: !!content?.productId,
    retry: false,
  });

  const galleryImages: string[] = [
    ...(product?.imageUrl ? [product.imageUrl] : []),
    ...(product?.metadata?.gallery?.map((g) => g.url) ?? []),
  ].filter((url, i, arr) => arr.indexOf(url) === i); // deduplicate

  // Fetch providers filtered by selected platform
  const { data: providers = [] } = useQuery({
    queryKey: ['providers-for-platform', platform],
    queryFn: () => publishingService.getProviders(platform),
  });

  // Reset provider selection when platform changes
  useEffect(() => {
    setProviderId(providers[0]?.id ?? '');
  }, [providers]);

  function toggleAsset(url: string) {
    setSelectedAssets((prev) => {
      const exists = prev.find((a) => a.url === url);
      return exists
        ? prev.filter((a) => a.url !== url)
        : [...prev, { url, type: 'image' }];
    });
  }

  const mutation = useMutation({
    mutationFn: () =>
      publishingService.publish({
        contentId: contentId.trim(),
        platform,
        providerId,
        ...(scheduleMode === 'schedule' && scheduledAt
          ? { scheduledAt: new Date(scheduledAt).toISOString() }
          : {}),
        ...(selectedAssets.length > 0 ? { assets: selectedAssets } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-logs'] });
      onClose();
    },
  });

  const isSubmitDisabled =
    !contentId.trim() ||
    !providerId ||
    (scheduleMode === 'schedule' && !scheduledAt) ||
    mutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-semibold">Publish Content</h3>

        {/* Content ID */}
        {!initialContentId && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Content ID</label>
            <input
              type="text"
              placeholder="Enter content ID..."
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        )}

        {/* Platform */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Platform</label>
          <select
            value={platform}
            onChange={(e) => { setPlatform(e.target.value as Platform); setProviderId(''); }}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
            ))}
          </select>
        </div>

        {/* Provider */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Provider</label>
          {providers.length === 0 ? (
            <p className="text-xs text-amber-400 py-1">
              No providers configured for {PLATFORM_LABELS[platform]}. Add one in Settings → Publishing Providers.
            </p>
          ) : (
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Publish time */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Publish Time</label>
          <div className="flex gap-2">
            {(['now', 'schedule'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setScheduleMode(mode); if (mode === 'now') setScheduledAt(''); }}
                className={`flex items-center gap-1.5 flex-1 rounded-md px-3 py-2 text-sm font-medium border transition-colors ${
                  scheduleMode === mode
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                }`}
              >
                {mode === 'schedule' && <Clock className="h-3.5 w-3.5" />}
                {mode === 'now' ? 'Now' : 'Schedule'}
              </button>
            ))}
          </div>
          {scheduleMode === 'schedule' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 [color-scheme:dark]"
            />
          )}
        </div>

        {/* Assets */}
        {galleryImages.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Assets <span className="text-zinc-600 normal-case">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {galleryImages.map((url) => {
                const selected = selectedAssets.some((a) => a.url === url);
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => toggleAsset(url)}
                    className={`relative w-16 h-16 rounded-md border-2 overflow-hidden transition-colors ${
                      selected ? 'border-violet-500' : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {selected && (
                      <div className="absolute inset-0 bg-violet-600/40 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                          <span className="text-white text-[10px]">✓</span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedAssets.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <ImageIcon className="h-3 w-3" />
                {selectedAssets.length} image{selectedAssets.length > 1 ? 's' : ''} selected
                <button
                  onClick={() => setSelectedAssets([])}
                  className="ml-1 text-zinc-600 hover:text-zinc-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {mutation.isError && (
          <p className="text-xs text-red-400">
            {mutation.error instanceof Error ? mutation.error.message : 'Failed to publish'}
          </p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={isSubmitDisabled}
            className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {scheduleMode === 'schedule' ? 'Schedule' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
