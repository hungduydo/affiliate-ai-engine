import { apiClient } from '@core/api/api-client';

export interface IngestRequest {
  source: 'clickbank' | 'cj' | 'shopee';
  keyword: string;
  limit: number;
}

export interface CsvPreviewResponse {
  filePath: string;
  headers: string[];
  rows: string[][];
}

export interface CsvConfirmRequest {
  filePath: string;
  source: string;
  mapping: Record<string, string>;
}

export interface JobResponse {
  jobId: string;
  status: string;
}

export interface JobStatusResponse {
  id: string;
  name: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  data: Record<string, unknown>;
  result?: { saved?: number; skipped?: number; errors?: number; imported?: number };
  failedReason?: string;
  progress?: number;
  createdAt: string;
}

export const importService = {
  ingest: (data: IngestRequest): Promise<JobResponse> =>
    apiClient.post<JobResponse>('/source-connector/ingest', data).then((r) => r.data),

  uploadCsv: (file: File): Promise<CsvPreviewResponse> => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post<CsvPreviewResponse>('/source-connector/import-csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  confirmCsv: (data: CsvConfirmRequest): Promise<JobResponse> =>
    apiClient.post<JobResponse>('/source-connector/import-csv/confirm', data).then((r) => r.data),

  getJobStatus: (jobId: string, queue?: string): Promise<JobStatusResponse> =>
    apiClient
      .get<JobStatusResponse>(`/source-connector/jobs/${jobId}`, { params: queue ? { queue } : undefined })
      .then((r) => r.data),

  enrichProduct: (productId: string): Promise<JobResponse> =>
    apiClient.post<JobResponse>(`/source-connector/enrich/${productId}`).then((r) => r.data),

  enrichBatch: (productIds: string[]): Promise<{ jobIds: string[]; count: number }> =>
    apiClient.post<{ jobIds: string[]; count: number }>('/source-connector/enrich-batch', { productIds }).then((r) => r.data),
};
