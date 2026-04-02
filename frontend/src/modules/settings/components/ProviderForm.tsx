import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settings.service';
import type { PublishProvider, ProviderKey, Platform } from '@core/api/api.types';
import { PLATFORM_LABELS, PROVIDER_KEY_LABELS, PROVIDER_SUPPORTED_PLATFORMS } from '@core/api/api.types';

interface ProviderFormProps {
  provider?: PublishProvider; // undefined = create mode
  onClose: () => void;
}

// Credential field definitions per provider key
const CREDENTIAL_FIELDS: Record<ProviderKey, { key: string; label: string; placeholder?: string }[]> = {
  BUFFER: [
    { key: 'apiToken', label: 'API Token', placeholder: 'buf_...' },
    { key: 'organizationId', label: 'Organization ID', placeholder: 'Your Buffer org ID' },
  ],
  PUBLER: [
    { key: 'apiToken', label: 'API Token', placeholder: 'Your Publer API token' },
  ],
  DIRECT: [
    { key: 'wordpressUrl', label: 'WordPress URL', placeholder: 'https://yourblog.com' },
    { key: 'wordpressUsername', label: 'WordPress Username' },
    { key: 'wordpressAppPassword', label: 'WordPress App Password', placeholder: 'xxxx xxxx xxxx xxxx' },
    { key: 'shopifyStoreUrl', label: 'Shopify Store URL', placeholder: 'https://yourstore.myshopify.com' },
    { key: 'shopifyAccessToken', label: 'Shopify Access Token', placeholder: 'shpat_...' },
    { key: 'shopifyBlogId', label: 'Shopify Blog ID', placeholder: '12345678' },
    { key: 'facebookPageId', label: 'Facebook Page ID' },
    { key: 'facebookAccessToken', label: 'Facebook Access Token' },
  ],
};

export function ProviderForm({ provider, onClose }: ProviderFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!provider;

  const [providerKey, setProviderKey] = useState<ProviderKey>(provider?.key ?? 'BUFFER');
  const [label, setLabel] = useState(provider?.label ?? '');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(provider?.enabledPlatforms ?? []);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(provider?.isActive ?? true);

  const supportedPlatforms = PROVIDER_SUPPORTED_PLATFORMS[providerKey];
  const credentialFields = CREDENTIAL_FIELDS[providerKey];

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  }

  function onKeyChange(key: ProviderKey) {
    setProviderKey(key);
    setSelectedPlatforms([]);
    setCredentials({});
  }

  const createMutation = useMutation({
    mutationFn: () =>
      settingsService.createProvider({
        key: providerKey,
        label,
        enabledPlatforms: selectedPlatforms,
        credentials,
        isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      settingsService.updateProvider(provider!.id, {
        label,
        enabledPlatforms: selectedPlatforms,
        // Only send credentials if user filled any field
        ...(Object.values(credentials).some(Boolean) && { credentials }),
        isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      onClose();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const isValid = label.trim() && selectedPlatforms.length > 0 && (!isEdit ? Object.values(credentials).some(Boolean) : true);

  function handleSubmit() {
    if (isEdit) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-semibold">{isEdit ? 'Edit Provider' : 'Add Publishing Provider'}</h3>

        {/* Provider type */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Provider Type</label>
          <select
            value={providerKey}
            onChange={(e) => onKeyChange(e.target.value as ProviderKey)}
            disabled={isEdit}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
          >
            {(Object.keys(PROVIDER_KEY_LABELS) as ProviderKey[]).map((k) => (
              <option key={k} value={k}>{PROVIDER_KEY_LABELS[k]}</option>
            ))}
          </select>
        </div>

        {/* Label */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Display Name</label>
          <input
            type="text"
            placeholder={`e.g. My ${PROVIDER_KEY_LABELS[providerKey]}`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        {/* Platform selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Enabled Platforms</label>
          <div className="grid grid-cols-2 gap-2">
            {supportedPlatforms.map((platform) => (
              <label
                key={platform}
                className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform)}
                  onChange={() => togglePlatform(platform)}
                  className="accent-violet-500"
                />
                <span className="text-sm text-zinc-300">{PLATFORM_LABELS[platform]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Credentials */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Credentials{isEdit && <span className="ml-1 text-zinc-600 normal-case">(leave blank to keep existing)</span>}
          </label>
          <div className="space-y-2">
            {credentialFields.map((field) => (
              <div key={field.key} className="space-y-0.5">
                <label className="text-xs text-zinc-500">{field.label}</label>
                <input
                  type={field.key.toLowerCase().includes('password') || field.key.toLowerCase().includes('token') ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={credentials[field.key] ?? ''}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-violet-500"
          />
          <label htmlFor="isActive" className="text-sm text-zinc-300 cursor-pointer">Active</label>
        </div>

        {error && (
          <p className="text-xs text-red-400">
            {error instanceof Error ? error.message : 'Failed to save provider'}
          </p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Provider'}
          </button>
        </div>
      </div>
    </div>
  );
}
