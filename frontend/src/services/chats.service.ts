import { api } from '@/lib/api';
import type { Conversation } from '@/types';

/** محادثات واتساب / الصندوق الموحّد (Chats) */
export const chatsService = {
  list: (params?: { status?: string; customerId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.customerId) q.set('customerId', params.customerId);
    const qs = q.toString();
    return api.get<Conversation[]>(`/conversations${qs ? `?${qs}` : ''}`);
  },

  setAiPaused: (id: string, aiPaused: boolean) =>
    api.put(`/conversations/${id}/ai-paused`, { aiPaused }),

  assign: (id: string, assignedTo: string | null) =>
    api.put(`/conversations/${id}/assign`, { assignedTo }),
};
