import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Save, X, RefreshCw, CheckCircle, Send, Loader2 } from 'lucide-react';
import { contentService } from '../services/content.service';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { formatDate } from '@shared/utils/format';
import type { Platform, ContentStatus } from '@core/api/api.types';

const PLATFORMS: Platform[] = ['WORDPRESS', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'SHOPIFY'];

export function ContentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [publishPlatform, setPublishPlatform] = useState<Platform>('WORDPRESS');
  const [showPublish, setShowPublish] = useState(false);

  const { data: content, isLoading, isError } = useQuery({
    queryKey: ['content', id],
    queryFn: () => contentService.getById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (dto: { title?: string; body?: string }) => contentService.update(id!, dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(['content', id], updated);
      queryClient.invalidateQueries({ queryKey: ['content'] });
      setEditing(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: ContentStatus) => contentService.updateStatus(id!, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['content', id], updated);
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => contentService.triggerGenerate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', id] });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      fetch('/api/publishing/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: id, platform: publishPlatform }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      setShowPublish(false);
      navigate('/publishing');
    },
  });

  function startEdit() {
    if (!content) return;
    setEditTitle(content.title ?? '');
    setEditBody(content.body);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function saveEdit() {
    updateMutation.mutate({ title: editTitle || undefined, body: editBody });
  }

  if (isLoading) {
    return <div className="text-zinc-500 text-sm py-16 text-center">Loading...</div>;
  }

  if (isError || !content) {
    return <div className="text-red-400 text-sm py-16 text-center">Content not found.</div>;
  }

  const canRegenerate = content.status === 'RAW' || content.status === 'FAILED';
  const canApprove = content.status === 'GENERATED';
  const canPublish = content.status === 'GENERATED' || content.status === 'PENDING_APPROVAL';

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/content')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Content
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-white truncate">
            {content.title ?? <span className="text-zinc-500 italic">Untitled</span>}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={content.status} />
            <span className="text-zinc-500 text-xs">{content.platform}</span>
            <span className="text-zinc-500 text-xs">·</span>
            <span className="text-zinc-500 text-xs">{content.contentType.replace(/_/g, ' ')}</span>
            <span className="text-zinc-500 text-xs">·</span>
            <span className="text-zinc-500 text-xs">{formatDate(content.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {!editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 rounded-md px-3 py-1.5 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
        {canRegenerate && (
          <button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-violet-400 border border-zinc-700 rounded-md px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            {regenerateMutation.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate
          </button>
        )}
        {canApprove && (
          <button
            onClick={() => statusMutation.mutate('PENDING_APPROVAL')}
            disabled={statusMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-800 rounded-md px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Approve
          </button>
        )}
        {canPublish && !showPublish && (
          <button
            onClick={() => setShowPublish(true)}
            className="flex items-center gap-1.5 text-xs text-white bg-violet-600 hover:bg-violet-500 rounded-md px-3 py-1.5 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Publish
          </button>
        )}
        {showPublish && (
          <div className="flex items-center gap-2">
            <select
              value={publishPlatform}
              onChange={(e) => setPublishPlatform(e.target.value as Platform)}
              className="text-xs bg-zinc-800 border border-zinc-700 text-white rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="flex items-center gap-1.5 text-xs text-white bg-violet-600 hover:bg-violet-500 rounded-md px-3 py-1.5 disabled:opacity-50 transition-colors"
            >
              {publishMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Go
            </button>
            <button
              onClick={() => setShowPublish(false)}
              className="text-xs text-zinc-400 hover:text-white px-1.5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content card */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
        {editing ? (
          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="(no title)"
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Body</label>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={16}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y font-mono"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-md px-4 py-1.5 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {content.title && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Title</p>
                <p className="text-white font-medium text-base">{content.title}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Body</p>
              <div className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
                {content.body || <span className="text-zinc-600 italic">No content yet.</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
