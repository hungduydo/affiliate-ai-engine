import { cn } from '@shared/utils/cn';
import type { EnrichStatus } from '@core/api/api.types';

const ENRICH_STYLES: Record<EnrichStatus, string> = {
  PENDING:   'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  ENRICHING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DONE:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FAILED:    'bg-red-500/10 text-red-400 border-red-500/20',
  SKIPPED:   'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

const ENRICH_LABELS: Record<EnrichStatus, string> = {
  PENDING:   'Not enriched',
  ENRICHING: 'Fetching...',
  DONE:      'Enriched',
  FAILED:    'Failed',
  SKIPPED:   'Skipped',
};

interface Props {
  status: EnrichStatus;
  className?: string;
}

export function EnrichStatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border',
        ENRICH_STYLES[status],
        className,
      )}
    >
      {status === 'ENRICHING' && (
        <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
      )}
      {ENRICH_LABELS[status]}
    </span>
  );
}
