import { api } from '@/lib/api';
import type { DashboardStats } from '@/types';

export const dashboardService = {
  stats: () => api.get<DashboardStats>('/dashboard/stats'),
  reports: () => api.get<Record<string, unknown>>('/dashboard/reports'),
};
