import { useMutation } from '@tanstack/react-query';
import { CheckCircle, Loader2 } from 'lucide-react';
import { importService } from '../../services/import.service';
import { JobStatusCard } from '../JobStatusCard';

interface Props {
  filePath: string;
  headers: string[];
  rows: string[][];
  mapping: Record<string, string>;
  source: string;
}

export function ImportPreview({ filePath, headers, rows, mapping, source }: Props) {
  const mappedHeaders = headers.map((h) => mapping[h] && mapping[h] !== 'skip' ? mapping[h] : null);

  const mutation = useMutation({
    mutationFn: importService.confirmCsv,
  });

  const activeMappings = Object.entries(mapping).filter(([, v]) => v !== 'skip').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-300">
            Preview <span className="text-zinc-500">(first {rows.length} rows)</span>
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeMappings} of {headers.length} columns mapped
          </p>
        </div>

        {!mutation.data && (
          <button
            onClick={() => mutation.mutate({ filePath, source, mapping })}
            disabled={mutation.isPending || activeMappings === 0}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Confirm Import
          </button>
        )}
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900">
            <tr>
              {headers.map((h, i) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-zinc-400 whitespace-nowrap">
                  <span className="font-mono">{h}</span>
                  {mappedHeaders[i] && (
                    <span className="ml-1 text-violet-400">→ {mappedHeaders[i]}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((row, ri) => (
              <tr key={ri} className="bg-zinc-950 hover:bg-zinc-900/50">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-zinc-300 whitespace-nowrap max-w-[200px] truncate">
                    {cell || <span className="text-zinc-600">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mutation.data && <JobStatusCard jobId={mutation.data.jobId} />}

      {mutation.isError && (
        <p className="text-sm text-red-400">
          {mutation.error instanceof Error ? mutation.error.message : 'Import failed'}
        </p>
      )}
    </div>
  );
}
