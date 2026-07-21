import { api, type RequestOptions } from '@/lib/api';
import type { Customer, Paginated } from '@/types';

export type CustomersQuery = {
  search?: string;
  status?: string;
  limit?: number;
  page?: number;
};

export const customersService = {
  list: (q: CustomersQuery = {}, opts?: RequestOptions) => {
    const params = new URLSearchParams();
    if (q.search) params.set('search', q.search);
    if (q.status) params.set('status', q.status);
    if (q.limit) params.set('limit', String(q.limit));
    if (q.page) params.set('page', String(q.page));
    const qs = params.toString();
    return api.get<Paginated<Customer>>(`/customers${qs ? `?${qs}` : ''}`, opts);
  },

  get: (id: string) => api.get<Customer>(`/customers/${id}`),

  create: (body: Partial<Customer>) => api.post<Customer>('/customers', body),

  update: (id: string, body: Partial<Customer>) => api.put<Customer>(`/customers/${id}`, body),

  remove: (id: string) => api.delete(`/customers/${id}`),
};
