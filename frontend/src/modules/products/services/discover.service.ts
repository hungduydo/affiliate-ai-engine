import { apiClient } from '@core/api/api-client';
import type { DiscoverProduct, DiscoverResponse, IngestDiscoverResponse, Platform, ContentType } from '@core/api/api.types';

const LAST_PLATFORM_KEY = 'flow:import:lastPlatform';

export interface LastPlatformPrefs {
  platform: Platform;
  contentType: ContentType;
}

export const discoverService = {
  getProducts: (force = false): Promise<DiscoverResponse> =>
    apiClient
      .get<DiscoverResponse>('/source-connector/discover', { params: force ? { force: 'true' } : {} })
      .then((r) => r.data),

  ingestDiscover: (product: DiscoverProduct, platform: Platform, contentType: ContentType): Promise<IngestDiscoverResponse> =>
    apiClient
      .post<IngestDiscoverResponse>('/source-connector/ingest-discover', { product, platform, contentType })
      .then((r) => r.data),

  getLastPlatformPrefs(): LastPlatformPrefs | null {
    try {
      const raw = localStorage.getItem(LAST_PLATFORM_KEY);
      return raw ? (JSON.parse(raw) as LastPlatformPrefs) : null;
    } catch {
      return null;
    }
  },

  saveLastPlatformPrefs(prefs: LastPlatformPrefs) {
    localStorage.setItem(LAST_PLATFORM_KEY, JSON.stringify(prefs));
  },
};
