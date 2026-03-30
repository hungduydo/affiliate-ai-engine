import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { settingsService } from '../services/settings.service';
import type { ConnectorStatus } from '@core/api/api.types';

const CONNECTOR_LABELS: { key: keyof ConnectorStatus; label: string; description: string }[] = [
  { key: 'gemini', label: 'Gemini AI', description: 'GOOGLE_API_KEY' },
  { key: 'clickbank', label: 'ClickBank', description: 'CLICKBANK_DEV_API_KEY + CLICKBANK_CLERK_ID' },
  { key: 'cj', label: 'CJ Affiliate', description: 'CJ_API_TOKEN + CJ_WEBSITE_ID' },
  { key: 'shopee', label: 'Shopee', description: 'SHOPEE_COOKIE_FILE_PATH' },
  { key: 'wordpress', label: 'WordPress', description: 'WORDPRESS_URL + USERNAME + APP_PASSWORD' },
  { key: 'facebook', label: 'Facebook', description: 'FACEBOOK_PAGE_ID + ACCESS_TOKEN' },
  { key: 'shopify', label: 'Shopify', description: 'SHOPIFY_STORE_URL + ACCESS_TOKEN + BLOG_ID' },
];

export function ConnectorStatus() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['connector-status'],
    queryFn: settingsService.getConnectorStatus,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 text-sm py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking connector status...
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-red-400 text-sm py-4">Failed to load connector status.</div>;
  }

  return (
    <div className="space-y-2">
      {CONNECTOR_LABELS.map(({ key, label, description }) => {
        const configured = data[key];
        return (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{description}</p>
            </div>
            {configured ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Configured
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <XCircle className="h-4 w-4" />
                Not set
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
