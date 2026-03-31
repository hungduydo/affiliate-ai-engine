import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Save } from 'lucide-react';
import { settingsService } from '../services/settings.service';
import type { PromptTemplate, Platform, ContentType } from '@core/api/api.types';

const PLATFORMS: Platform[] = ['WORDPRESS', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'SHOPIFY'];

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  BLOG_POST: 'Blog Post',
  SOCIAL_POST: 'Social Post',
  VIDEO_SCRIPT: 'Video Script',
  CAROUSEL: 'Carousel (Slides)',
  THREAD: 'Thread (X / Twitter)',
  HERO_COPY: 'Hero Copy (Website)',
};
const CONTENT_TYPES = Object.keys(CONTENT_TYPE_LABELS) as ContentType[];
const VARIABLE_HINTS = ['{{name}}', '{{description}}', '{{price}}', '{{commission}}', '{{affiliateLink}}'];

interface Props {
  template?: PromptTemplate | null;
  onClose: () => void;
}

export function PromptTemplateForm({ template, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!template;

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<Platform>('WORDPRESS');
  const [contentType, setContentType] = useState<ContentType>('BLOG_POST');
  const [templateText, setTemplateText] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setPlatform(template.platform);
      setContentType(template.contentType);
      setTemplateText(template.template);
      setIsActive(template.isActive);
    }
  }, [template]);

  const mutation = useMutation({
    mutationFn: () =>
      isEditing
        ? settingsService.updatePrompt(template.id, { name, template: templateText, isActive })
        : settingsService.createPrompt({ name, platform, contentType, template: templateText, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
      onClose();
    },
  });

  const isValid = name.trim() && templateText.trim();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">
            {isEditing ? 'Edit Template' : 'New Prompt Template'}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. WordPress Blog Post"
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                disabled={isEditing}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
              >
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                disabled={isEditing}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
              >
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Template</label>
              <div className="flex gap-1 flex-wrap justify-end">
                {VARIABLE_HINTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTemplateText((t) => t + v)}
                    className="text-xs font-mono text-violet-400 hover:text-violet-300 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={8}
              placeholder="Write a {{contentType}} about {{name}}. Price: {{price}}. Affiliate link: {{affiliateLink}}"
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y font-mono"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-zinc-300">Active</span>
          </label>
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-400">
            {mutation.error instanceof Error ? mutation.error.message : 'Save failed'}
          </p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isEditing ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
