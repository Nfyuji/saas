'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';

export const dashboardKeys = {
  stats: ['dashboard', 'stats'] as const,
  reports: ['dashboard', 'reports'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats,
    queryFn: () => dashboardService.stats(),
  });
}

export function useDashboardReports() {
  return useQuery({
    queryKey: dashboardKeys.reports,
    queryFn: () => dashboardService.reports(),
  });
}
