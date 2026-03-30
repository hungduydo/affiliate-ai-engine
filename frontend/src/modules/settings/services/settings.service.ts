import { apiClient } from '@core/api/api-client';
import type { PromptTemplate, ConnectorStatus, Platform, ContentType } from '@core/api/api.types';

export interface CreatePromptDto {
  name: string;
  platform: Platform;
  contentType: ContentType;
  template: string;
  isActive?: boolean;
}

export interface UpdatePromptDto {
  name?: string;
  template?: string;
  isActive?: boolean;
}

export const settingsService = {
  getPrompts: (params: { platform?: Platform; contentType?: ContentType; isActive?: boolean } = {}) =>
    apiClient.get<{ data: PromptTemplate[] }>('/config/prompts', { params }).then((r) => r.data),

  createPrompt: (dto: CreatePromptDto): Promise<PromptTemplate> =>
    apiClient.post<PromptTemplate>('/config/prompts', dto).then((r) => r.data),

  updatePrompt: (id: string, dto: UpdatePromptDto): Promise<PromptTemplate> =>
    apiClient.put<PromptTemplate>(`/config/prompts/${id}`, dto).then((r) => r.data),

  deletePrompt: (id: string): Promise<void> =>
    apiClient.delete(`/config/prompts/${id}`).then(() => undefined),

  getConnectorStatus: (): Promise<ConnectorStatus> =>
    apiClient.get<ConnectorStatus>('/config/connector-status').then((r) => r.data),
};
