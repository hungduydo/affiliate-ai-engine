import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Sparkles } from 'lucide-react';
import { settingsService } from '../services/settings.service';
import { PromptTemplateForm } from './PromptTemplateForm';
import { StatusBadge } from '@shared/ui/StatusBadge';
import type { PromptTemplate } from '@core/api/api.types';

export function PromptTemplateTable() {
  const queryClient = useQueryClient();
  const [formTarget, setFormTarget] = useState<PromptTemplate | null | undefined>(undefined);
  // undefined = form closed, null = creating new, PromptTemplate = editing existing
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['prompt-templates'],
    queryFn: () => settingsService.getPrompts(), // no isActive filter → returns all templates
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsService.deletePrompt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
      setConfirmDelete(null);
    },
  });

  const templates = data?.data ?? [];

  return (
    <>
      {formTarget !== undefined && (
        <PromptTemplateForm
          template={formTarget}
          onClose={() => setFormTarget(undefined)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold">Delete Template</h3>
            <p className="text-zinc-400 text-sm">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => setFormTarget(null)}
            className="flex items-center gap-2 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Template
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : isError ? (
          <div className="text-red-400 text-sm py-4">Failed to load templates.</div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center bg-zinc-800/40 border border-zinc-700 rounded-lg">
            <Sparkles className="h-8 w-8 text-zinc-600" />
            <p className="text-zinc-400 text-sm">No prompt templates yet.</p>
            <button
              onClick={() => setFormTarget(null)}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Create your first template →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800">
                  {['Name', 'Platform', 'Type', 'Active', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-zinc-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-700/50 hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{t.name}</td>
                    <td className="px-4 py-3 text-zinc-300 text-xs">{t.platform}</td>
                    <td className="px-4 py-3 text-zinc-300 text-xs">{t.contentType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => setFormTarget(t)}
                          className="text-zinc-400 hover:text-violet-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(t.id)}
                          className="text-zinc-400 hover:text-red-400 transition-colors"
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
      </div>
    </>
  );
}
