import { apiClient } from '@core/api/api-client';
import type { PublishLog, PublishAsset, PaginatedResult, Platform, PublishStatus, ProviderInfo } from '@core/api/api.types';

export interface PublishRequest {
  contentId: string;
  platform: string;
  providerId: string;
  scheduledAt?: string;   // ISO 8601 UTC — null/omit to publish now
  assets?: PublishAsset[];
}

export interface PublishResponse {
  publishLogId: string;
  jobId: string;
}

export const publishingService = {
  getLogs: (params: { contentId?: string; platform?: Platform; status?: PublishStatus; page?: number; limit?: number } = {}) =>
    apiClient.get<PaginatedResult<PublishLog>>('/publishing/logs', { params }).then((r) => r.data),

  getLogById: (id: string) =>
    apiClient.get<PublishLog>(`/publishing/logs/${id}`).then((r) => r.data),

  publish: (data: PublishRequest): Promise<PublishResponse> =>
    apiClient.post<PublishResponse>('/publishing/publish', data).then((r) => r.data),

  getProviders: (platform: string): Promise<ProviderInfo[]> =>
    apiClient.get<{ data: ProviderInfo[] }>('/publishing/providers', { params: { platform } }).then((r) => r.data.data),
};
