import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, Loader2 } from 'lucide-react';
import { importService } from '../services/import.service';
import { JobStatusCard } from './JobStatusCard';

const SOURCES = [
  { value: 'clickbank', label: 'ClickBank' },
  { value: 'cj', label: 'CJ Affiliate' },
  { value: 'shopee', label: 'Shopee' },
] as const;

export function IngestionForm() {
  const [source, setSource] = useState<'clickbank' | 'cj' | 'shopee'>('clickbank');
  const [keyword, setKeyword] = useState('');
  const [limit, setLimit] = useState(50);
  const [jobId, setJobId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: importService.ingest,
    onSuccess: (data) => setJobId(data.jobId),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setJobId(null);
    mutation.mutate({ source, keyword: keyword.trim(), limit });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Keyword</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. weight loss"
              required
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Limit <span className="text-zinc-500 normal-case font-normal">({limit})</span>
            </label>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending || !keyword.trim()}
          className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Start Import
        </button>

        {mutation.isError && (
          <p className="text-sm text-red-400">
            {mutation.error instanceof Error ? mutation.error.message : 'Import failed'}
          </p>
        )}
      </form>

      {jobId && <JobStatusCard jobId={jobId} />}
    </div>
  );
}
