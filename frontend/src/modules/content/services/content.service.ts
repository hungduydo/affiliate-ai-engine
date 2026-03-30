import { apiClient } from '@core/api/api-client';
import type { Content, PaginatedResult, Platform, ContentStatus, ContentType } from '@core/api/api.types';

export interface GenerateContentRequest {
  productId: string;
  platform: Platform;
  contentType: ContentType;
  promptId?: string;
}

export interface GenerateContentResponse {
  contentId: string;
  jobId: string;
}

export const contentService = {
  getMany: (params: { productId?: string; platform?: Platform; status?: ContentStatus; page?: number; limit?: number } = {}) =>
    apiClient.get<PaginatedResult<Content>>('/content', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Content>(`/content/${id}`).then((r) => r.data),

  updateStatus: (id: string, status: ContentStatus) =>
    apiClient.put<Content>(`/content/${id}/status`, { status }).then((r) => r.data),

  generate: (data: GenerateContentRequest): Promise<GenerateContentResponse> =>
    apiClient.post<GenerateContentResponse>('/content', data).then((r) => r.data),

  triggerGenerate: (contentId: string): Promise<GenerateContentResponse> =>
    apiClient.post<GenerateContentResponse>(`/content/${contentId}/generate`).then((r) => r.data),

  update: (id: string, dto: { title?: string; body?: string }): Promise<Content> =>
    apiClient.patch<Content>(`/content/${id}`, dto).then((r) => r.data),

  getPromptTemplates: (params: { platform?: Platform; contentType?: ContentType } = {}) =>
    apiClient.get('/config/prompts', { params }).then((r) => r.data),
};
