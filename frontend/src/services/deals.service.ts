import { api } from '@/lib/api';
import type { Deal } from '@/types';

export const dealsService = {
  list: (params?: { stage?: string; customerId?: string }) => {
    const q = new URLSearchParams();
    if (params?.stage) q.set('stage', params.stage);
    if (params?.customerId) q.set('customerId', params.customerId);
    const qs = q.toString();
    return api.get<Deal[]>(`/deals${qs ? `?${qs}` : ''}`);
  },

  create: (body: {
    customerId: string;
    title: string;
    value?: number;
    items?: Array<{ name: string; quantity: number; price: number }>;
  }) => api.post<Deal>('/deals', body),

  updateStage: (id: string, stage: string, lostReason?: string) =>
    api.put<Deal>(`/deals/${id}/stage`, { stage, lostReason }),

  sendQuote: (id: string) => api.post<{ message: string }>(`/deals/${id}/quote`),
};
