import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publishingService } from '../services/publishing.service';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { formatDate } from '@shared/utils/format';
import { ExternalLink, Send, Loader2 } from 'lucide-react';
import type { Platform, PublishStatus } from '@core/api/api.types';

const PLATFORMS: Platform[] = ['WORDPRESS', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'SHOPIFY'];
const STATUSES: PublishStatus[] = ['PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED'];

function PublishDialog({ onClose }: { onClose: () => void }) {
  const [contentId, setContentId] = useState('');
  const [platform, setPlatform] = useState<Platform>('WORDPRESS');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => publishingService.publish({ contentId: contentId.trim(), platform }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-logs'] });
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
            disabled={!contentId.trim() || mutation.isPending}
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

export function PublishingPage() {
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [status, setStatus] = useState<PublishStatus | ''>('');
  const [page, setPage] = useState(1);
  const [showDialog, setShowDialog] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['publish-logs', { platform, status, page }],
    queryFn: () => publishingService.getLogs({ platform: platform || undefined, status: status || undefined, page }),
    refetchInterval: (query) => {
      const logs = query.state.data?.data ?? [];
      const hasInProgress = logs.some((l) => l.status === 'PENDING' || l.status === 'PUBLISHING');
      return hasInProgress ? 5000 : false;
    },
  });

  return (
    <div className="space-y-5">
      {showDialog && <PublishDialog onClose={() => setShowDialog(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-semibold">Distribution Hub</h2>
          <p className="text-zinc-400 text-sm mt-0.5">
            {data ? `${data.total} publish logs` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          <Send className="h-4 w-4" />
          Publish Content
        </button>
      </div>

      <div className="flex gap-3">
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value as Platform | ''); setPage(1); }}
          className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-violet-500"
        >
          <option value="">All Platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as PublishStatus | ''); setPage(1); }}
          className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-violet-500"
        >
          <option value="">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Loading...</div>
      ) : isError ? (
        <div className="text-red-400 text-sm py-8 text-center">Failed to load logs</div>
      ) : data?.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center bg-zinc-800/40 border border-zinc-700 rounded-lg">
          <Send className="h-8 w-8 text-zinc-600" />
          <p className="text-zinc-400 text-sm">No publish logs yet.</p>
          <button
            onClick={() => setShowDialog(true)}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Publish your first piece →
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800">
                  {['Content', 'Platform', 'Status', 'Published At', 'Link'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-zinc-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-700/50 hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 text-white font-mono text-xs truncate max-w-[180px]">
                      {log.contentId}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{log.platform}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {log.publishedAt ? formatDate(log.publishedAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {log.publishedLink ? (
                        <a
                          href={log.publishedLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 text-xs"
                        >
                          <ExternalLink size={12} />
                          View
                        </a>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      )}
    </div>
  );
}
