import { apiClient } from '@core/api/api-client';
import type { PublishLog, PaginatedResult, Platform, PublishStatus } from '@core/api/api.types';

export interface PublishRequest {
  contentId: string;
  platform: Platform;
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
};
