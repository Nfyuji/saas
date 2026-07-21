'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dealsService } from '@/services/deals.service';
import { useToast } from '@/components/ui/toast';
import type { Deal } from '@/types';

export const dealKeys = {
  all: ['deals'] as const,
  list: (stage?: string) => ['deals', 'list', stage || 'all'] as const,
};

export function useDeals(stage?: string) {
  return useQuery({
    queryKey: dealKeys.list(stage),
    queryFn: () => dealsService.list(stage ? { stage } : undefined),
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: dealsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.all });
      toast.success('تم إنشاء الصفقة');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => dealsService.updateStage(id, stage),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: dealKeys.all });
      const previous = qc.getQueriesData<Deal[]>({ queryKey: dealKeys.all });
      qc.setQueriesData<Deal[]>({ queryKey: dealKeys.all }, (old) =>
        old ? old.map((d) => (d._id === id ? { ...d, stage } : d)) : old,
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: dealKeys.all }),
  });
}

export function useSendDealQuote() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => dealsService.sendQuote(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: dealKeys.all });
      toast.success(res.message || 'تم إرسال العرض');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
