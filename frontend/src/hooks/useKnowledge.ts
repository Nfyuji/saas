'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '@/services/knowledge.service';
import { useToast } from '@/components/ui/toast';

export const knowledgeKeys = {
  all: ['knowledge'] as const,
};

export function useKnowledge() {
  return useQuery({
    queryKey: knowledgeKeys.all,
    queryFn: () => knowledgeService.list(),
  });
}

export function useCreateKnowledge() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: knowledgeService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeKeys.all });
      toast.success('تم حفظ المعرفة');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUploadKnowledge() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (fd: FormData) => knowledgeService.upload(fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeKeys.all });
      toast.success('تم رفع الملف');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteKnowledge() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => knowledgeService.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: knowledgeKeys.all });
      const prev = qc.getQueryData(knowledgeKeys.all);
      qc.setQueryData(knowledgeKeys.all, (old: Array<{ _id: string }> | undefined) =>
        old ? old.filter((d) => d._id !== id) : old,
      );
      return { prev };
    },
    onError: (e: Error, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(knowledgeKeys.all, ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => toast.success('تم الحذف'),
    onSettled: () => qc.invalidateQueries({ queryKey: knowledgeKeys.all }),
  });
}
