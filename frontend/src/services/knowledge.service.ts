import { api } from '@/lib/api';
import type { KnowledgeDoc } from '@/types';

/** قاعدة المعرفة (بديل products في هذا المنتج) */
export const knowledgeService = {
  list: () => api.get<KnowledgeDoc[]>('/knowledge'),
  create: (body: { title: string; content: string; type?: string }) =>
    api.post<KnowledgeDoc>('/knowledge', body),
  upload: (formData: FormData) => api.post<KnowledgeDoc>('/knowledge/upload', formData),
  remove: (id: string) => api.delete(`/knowledge/${id}`),
};

/** توافق مع اسم products في المعمارية المطلوبة */
export const productsService = knowledgeService;
