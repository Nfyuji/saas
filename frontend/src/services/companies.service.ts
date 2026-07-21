import { api } from '@/lib/api';

export const companiesService = {
  me: () => api.get<Record<string, unknown>>('/companies/me'),
  update: (body: Record<string, unknown>) => api.put('/companies/me', body),
  updateSettings: (body: Record<string, unknown>) => api.put('/companies/me/settings', body),
};
