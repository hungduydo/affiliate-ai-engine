import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, RefreshCw, Send, Loader2 } from 'lucide-react';
import { useContent } from '../hooks/useContent';
import { contentService } from '../services/content.service';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { formatDate } from '@shared/utils/format';
import { PLATFORMS, PLATFORM_LABELS } from '@core/api/api.types';
import type { Content, ContentStatus, Platform } from '@core/api/api.types';

const CONTENT_STATUS_FLOW: ContentStatus[] = [
  'RAW', 'AI_PROCESSING', 'GENERATED', 'PENDING_APPROVAL', 'PUBLISHING', 'PUBLISHED',
];

function PublishModal({
  content,
  onClose,
}: {
  content: Content;
  onClose: () => void;
}) {
  const [platform, setPlatform] = useState<Platform>(content.platform);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      fetch('/api/publishing/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: content.id, platform }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-semibold">Publish Content</h3>
        <p className="text-zinc-400 text-sm truncate">{content.title ?? '(no title)'}</p>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
          </select>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContentListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ContentStatus | ''>('');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [page, setPage] = useState(1);
  const [publishTarget, setPublishTarget] = useState<Content | null>(null);

  const { data, isLoading, isError } = useContent({
    status: status || undefined,
    platform: platform || undefined,
    page,
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => contentService.triggerGenerate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['content'] }),
  });

  const canRegenerate = (s: ContentStatus) => s === 'RAW' || s === 'FAILED';
  const canPublish = (s: ContentStatus) => s === 'GENERATED' || s === 'PENDING_APPROVAL';

  return (
    <div className="space-y-5">
      {publishTarget && (
        <PublishModal content={publishTarget} onClose={() => setPublishTarget(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-semibold">Content Factory</h2>
          <p className="text-zinc-400 text-sm mt-0.5">
            {data ? `${data.total} content items` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={() => navigate('/content/generate')}
          className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Generate Content
        </button>
      </div>

      {/* Status flow */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CONTENT_STATUS_FLOW.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <StatusBadge status={s} />
            {i < CONTENT_STATUS_FLOW.length - 1 && (
              <span className="text-zinc-600 text-xs">→</span>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as ContentStatus | ''); setPage(1); }}
          className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-violet-500"
        >
          <option value="">All Status</option>
          {CONTENT_STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="FAILED">FAILED</option>
        </select>
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value as Platform | ''); setPage(1); }}
          className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-violet-500"
        >
          <option value="">All Platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Loading...</div>
      ) : isError ? (
        <div className="text-red-400 text-sm py-8 text-center">Failed to load content</div>
      ) : data?.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center bg-zinc-800/40 border border-zinc-700 rounded-lg">
          <Sparkles className="h-8 w-8 text-zinc-600" />
          <p className="text-zinc-400 text-sm">No content yet.</p>
          <button
            onClick={() => navigate('/content/generate')}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Generate your first piece →
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-800">
                {['Title', 'Platform', 'Type', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-zinc-400 font-medium text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.data.map((item) => (
                <tr key={item.id} className="border-b border-zinc-700/50 hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 max-w-[200px] truncate">
                    <Link
                      to={`/content/${item.id}`}
                      className="text-white font-medium hover:text-violet-300 transition-colors"
                    >
                      {item.title ?? <span className="text-zinc-600 italic">no title</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{item.platform}</td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">{item.contentType}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canRegenerate(item.status) && (
                        <button
                          onClick={() => regenerateMutation.mutate(item.id)}
                          disabled={regenerateMutation.isPending}
                          title="Regenerate"
                          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-violet-400 transition-colors disabled:opacity-40"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Regenerate
                        </button>
                      )}
                      {canPublish(item.status) && (
                        <button
                          onClick={() => setPublishTarget(item)}
                          title="Publish"
                          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Publish
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
    </div>
  );
}
