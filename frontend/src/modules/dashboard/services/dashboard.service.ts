import { apiClient } from '@core/api/api-client';

export interface DashboardStats {
  totalProducts: number;
  totalContent: number;
  publishedContent: number;
  pendingApproval: number;
}

export const dashboardService = {
  getStats: () =>
    apiClient.get<DashboardStats>('/dashboard/stats').then((r) => r.data),
};
