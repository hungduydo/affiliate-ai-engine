import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settings.service';
import { PLATFORM_LABELS, PROVIDER_KEY_LABELS } from '@core/api/api.types';
import type { PublishProvider } from '@core/api/api.types';
import { ProviderForm } from './ProviderForm';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

export function ProviderTable() {
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<PublishProvider | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => settingsService.getProviders(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });

  if (isLoading) {
    return <div className="text-zinc-500 text-sm py-8 text-center">Loading providers...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Configure API credentials for each publishing provider. Credentials are stored securely in the database.
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Provider
        </button>
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 bg-zinc-800/40 border border-zinc-700 rounded-lg text-center">
          <p className="text-zinc-400 text-sm">No publishing providers configured yet.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Add your first provider →
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-800">
                {['Label', 'Type', 'Platforms', 'Active', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-zinc-400 font-medium text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-b border-zinc-700/50 hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{p.label}</td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">
                    <span className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
                      {PROVIDER_KEY_LABELS[p.key] ?? p.key}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.enabledPlatforms.map((plat) => (
                        <span
                          key={plat}
                          className="px-1.5 py-0.5 rounded text-xs bg-violet-500/15 text-violet-300 border border-violet-500/20"
                        >
                          {PLATFORM_LABELS[plat] ?? plat}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.isActive ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <X className="h-4 w-4 text-zinc-600" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditTarget(p)}
                        className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete provider "${p.label}"?`)) {
                            deleteMutation.mutate(p.id);
                          }
                        }}
                        className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(showCreate || editTarget) && (
        <ProviderForm
          provider={editTarget ?? undefined}
          onClose={() => {
            setShowCreate(false);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
