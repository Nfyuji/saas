'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersService, type CustomersQuery } from '@/services/customers.service';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import type { Customer } from '@/types';

export const customerKeys = {
  all: ['customers'] as const,
  list: (q: CustomersQuery) => ['customers', 'list', q] as const,
  detail: (id: string) => ['customers', 'detail', id] as const,
};

export function useCustomers(q: CustomersQuery) {
  return useQuery({
    queryKey: customerKeys.list(q),
    queryFn: ({ signal }) => customersService.list(q, { signal }),
    select: (res) => res.data || [],
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: Partial<Customer>) => customersService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
      toast.success('تم إضافة العميل');
    },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : 'فشل الإنشاء'),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => customersService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
      toast.success('تم حذف العميل');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
