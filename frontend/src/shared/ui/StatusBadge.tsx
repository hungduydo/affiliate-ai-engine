import { cn } from '@shared/utils/cn';

type Status =
  | 'ACTIVE' | 'INACTIVE' | 'PENDING'
  | 'RAW' | 'ENRICHED' | 'AI_PROCESSING' | 'GENERATED' | 'PENDING_APPROVAL' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED'
  | 'COMPLETED' | 'PROCESSING' | 'RETRYING'
  | 'SCHEDULED';

const STATUS_STYLES: Record<Status, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  INACTIVE: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  SCHEDULED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  RAW: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  ENRICHED: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  AI_PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  GENERATED: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  PENDING_APPROVAL: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  PUBLISHING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  RETRYING: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        STATUS_STYLES[status] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        className,
      )}
    >
      {label}
    </span>
  );
}
