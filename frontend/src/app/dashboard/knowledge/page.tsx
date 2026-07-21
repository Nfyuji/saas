'use client';

import { useState } from 'react';
import { EmptyState, PageHeader } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  useCreateKnowledge,
  useDeleteKnowledge,
  useKnowledge,
  useUploadKnowledge,
} from '@/hooks/useKnowledge';

const typeLabels: Record<string, string> = {
  catalog: 'كتالوج',
  faq: 'أسئلة شائعة',
  policy: 'سياسة',
  product: 'منتج',
  other: 'أخرى',
};

export default function KnowledgePage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'catalog' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: docs = [], isLoading } = useKnowledge();
  const createDoc = useCreateKnowledge();
  const uploadDoc = useUploadKnowledge();
  const deleteDoc = useDeleteKnowledge();

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    createDoc.mutate(form, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ title: '', content: '', type: 'catalog' });
      },
    });
  };

  const uploadFile = (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', form.type || 'catalog');
    if (form.title.trim()) fd.append('title', form.title.trim());
    uploadDoc.mutate(fd, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ title: '', content: '', type: 'catalog' });
      },
    });
  };

  const busy = createDoc.isPending || uploadDoc.isPending;

  return (
    <div className="page-wrap">
      <PageHeader
        title="قاعدة المعرفة"
        subtitle="الصق نصاً أو ارفع ملفاً — الحذف والتحديث بدون إعادة تحميل"
        actions={
          <button type="button" onClick={() => setShowForm((v) => !v)} className="btn-orange text-sm">
            {showForm ? 'إغلاق النموذج' : '+ مستند'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={create} className="surface-card form-panel p-4 sm:p-6 space-y-3 mb-4">
          <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0">إضافة معرفة</h2>
          <label className="block text-sm font-bold">
            العنوان
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: أسعار الباقات"
              className="input-field mt-1.5"
            />
          </label>
          <label className="block text-sm font-bold">
            النوع
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="input-field mt-1.5"
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold">
            رفع ملف معرفة
            <input
              type="file"
              accept=".txt,.md,.csv,.json,text/plain"
              className="input-field mt-1.5"
              disabled={busy}
              onChange={(e) => uploadFile(e.target.files?.[0] || null)}
            />
            <span className="block text-xs text-[var(--muted)] mt-1 font-normal">
              الصيغ: txt · md · csv · json — حتى 2MB
              {uploadDoc.isPending ? ' · جاري الرفع...' : ''}
            </span>
          </label>
          <div className="text-xs text-[var(--muted)] text-center">أو الصق المحتوى يدوياً</div>
          <label className="block text-sm font-bold">
            المحتوى
            <textarea
              required
              rows={8}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="الصق هنا الأسعار، المنتجات، السياسات..."
              className="input-field mt-1.5"
            />
          </label>
          <div className="flex gap-3 form-actions">
            <button type="submit" disabled={busy} className="btn-teal flex-1 justify-center disabled:opacity-50">
              {createDoc.isPending ? 'جاري الحفظ...' : 'حفظ النص'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : (
        <div className="grid gap-4">
          {docs.map((d) => (
            <div key={d._id} className="surface-card p-5">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-semibold m-0">{d.title}</h3>
                  <p className="text-xs text-[var(--muted)] mt-1 mb-0">
                    <span className="badge badge-ok">{typeLabels[d.type] || d.type}</span>
                    {d.filename ? ` · ${d.filename}` : ''}
                    {' · '}استُخدم {d.useCount || 0} مرة
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteId(d._id)}
                  className="chip chip-orange text-sm shrink-0"
                >
                  حذف
                </button>
              </div>
              <p className="text-sm text-[var(--muted)] whitespace-pre-wrap line-clamp-4 mb-0">{d.content}</p>
            </div>
          ))}
          {!docs.length && !showForm && (
            <EmptyState
              title="قاعدة المعرفة فارغة"
              description="أضف كتالوج الأسعار والمنتجات والسياسات — المندوب الذكي يستشهد بها في كل رد."
              actionLabel="+ إضافة مستند"
              onAction={() => setShowForm(true)}
              secondaryLabel="تعليمات AI"
              secondaryHref="/dashboard/settings"
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="حذف المستند؟"
        description="سيُحذف من قاعدة المعرفة ولن يستخدمه المندوب الذكي بعد الآن."
        confirmLabel="حذف"
        danger
        loading={deleteDoc.isPending}
        onClose={() => !deleteDoc.isPending && setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          deleteDoc.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
        }}
      />
    </div>
  );
}
