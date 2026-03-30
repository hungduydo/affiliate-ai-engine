import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { importService, type JobStatusResponse } from '../services/import.service';

interface Props {
  jobId: string;
  onComplete?: (result: JobStatusResponse) => void;
}

const STATE_LABELS: Record<string, string> = {
  waiting: 'Queued',
  active: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  delayed: 'Delayed',
  unknown: 'Unknown',
};

export function JobStatusCard({ jobId, onComplete }: Props) {
  const { data: job, isLoading } = useQuery({
    queryKey: ['job-status', jobId],
    queryFn: () => importService.getJobStatus(jobId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (state === 'completed' || state === 'failed') return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (job && (job.state === 'completed' || job.state === 'failed')) {
      onComplete?.(job);
    }
  }, [job?.state, onComplete]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading job status…</span>
      </div>
    );
  }

  if (!job) return null;

  const isRunning = job.state === 'active' || job.state === 'waiting' || job.state === 'delayed';
  const isDone = job.state === 'completed';
  const isFailed = job.state === 'failed';

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        {isRunning && <Loader2 className="h-5 w-5 animate-spin text-blue-400 shrink-0" />}
        {isDone && <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />}
        {isFailed && <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
        {!isRunning && !isDone && !isFailed && <Clock className="h-5 w-5 text-zinc-500 shrink-0" />}

        <div>
          <p className="text-sm font-medium text-white">
            {STATE_LABELS[job.state] ?? job.state}
          </p>
          <p className="text-xs text-zinc-500">Job ID: {job.id}</p>
        </div>
      </div>

      {isDone && job.result && (
        <div className="grid grid-cols-3 gap-2">
          {job.result.saved !== undefined && (
            <div className="rounded bg-zinc-800 px-3 py-2 text-center">
              <p className="text-lg font-semibold text-emerald-400">{job.result.saved}</p>
              <p className="text-xs text-zinc-400">Saved</p>
            </div>
          )}
          {job.result.imported !== undefined && (
            <div className="rounded bg-zinc-800 px-3 py-2 text-center">
              <p className="text-lg font-semibold text-emerald-400">{job.result.imported}</p>
              <p className="text-xs text-zinc-400">Imported</p>
            </div>
          )}
          {job.result.errors !== undefined && job.result.errors > 0 && (
            <div className="rounded bg-zinc-800 px-3 py-2 text-center">
              <p className="text-lg font-semibold text-red-400">{job.result.errors}</p>
              <p className="text-xs text-zinc-400">Errors</p>
            </div>
          )}
        </div>
      )}

      {isFailed && job.failedReason && (
        <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded p-2">
          {job.failedReason}
        </p>
      )}
    </div>
  );
}
