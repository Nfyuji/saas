'use client';

import { useState } from 'react';
import { EmptyState, PageHeader } from '@/components/ui';
import { Modal } from '@/components/modal';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateDeal, useDeals, useSendDealQuote, useUpdateDealStage } from '@/hooks/useDeals';

const stages = [
  { id: 'lead', label: 'فرصة' },
  { id: 'qualified', label: 'مؤهلة' },
  { id: 'proposal', label: 'عرض سعر' },
  { id: 'negotiation', label: 'تفاوض' },
  { id: 'won', label: 'مُغلقة ✅' },
  { id: 'lost', label: 'خسارة' },
  { id: 'cold', label: 'باردة' },
];

export default function DealsPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    title: '',
    value: 0,
    itemName: '',
    itemPrice: 0,
  });

  const { data: deals = [], isLoading } = useDeals();
  const { data: customers = [] } = useCustomers({ limit: 100 });
  const createDeal = useCreateDeal();
  const updateStage = useUpdateDealStage();
  const sendQuote = useSendDealQuote();

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    createDeal.mutate(
      {
        customerId: form.customerId,
        title: form.title,
        value: Number(form.value),
        items: form.itemName
          ? [{ name: form.itemName, quantity: 1, price: Number(form.itemPrice || form.value) }]
          : [],
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setForm({ customerId: '', title: '', value: 0, itemName: '', itemPrice: 0 });
        },
      },
    );
  };

  return (
    <div className="page-wrap">
      <PageHeader
        title="خط أنابيب المبيعات"
        subtitle="تحديث المراحل فوري (Optimistic UI) بدون إعادة تحميل"
        actions={
          <button type="button" onClick={() => setShowForm(true)} className="btn-orange text-sm">
            + صفقة جديدة
          </button>
        }
      />

      <Modal open={showForm} onClose={() => !createDeal.isPending && setShowForm(false)}>
        <form
          onSubmit={create}
          className="modal-panel surface-card p-4 sm:p-6 space-y-3"
          style={{ width: 'min(100%, 28rem)' }}
        >
          <h2 className="font-bold text-lg">إنشاء صفقة</h2>
          <select
            required
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            className="input-field"
          >
            <option value="">اختر عميلاً</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="عنوان الصفقة"
            className="input-field"
          />
          <input
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            placeholder="القيمة"
            className="input-field"
          />
          <input
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            placeholder="اسم المنتج/الخدمة (اختياري)"
            className="input-field"
          />
          <div className="flex gap-3 form-actions">
            <button
              type="submit"
              disabled={createDeal.isPending}
              className="btn-teal flex-1 justify-center disabled:opacity-50"
            >
              {createDeal.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-ghost flex-1 justify-center"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {deals.map((d) => {
            const customer =
              d.customerId && typeof d.customerId === 'object' ? d.customerId : undefined;
            return (
              <div key={d._id} className="mode-card">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold">{d.title}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {customer?.name} · {customer?.phone}
                    </p>
                  </div>
                  <p className="font-bold text-[var(--teal)]">
                    {(d.value || 0).toLocaleString('ar')} {d.currency}
                  </p>
                </div>
                <select
                  value={d.stage}
                  disabled={updateStage.isPending}
                  onChange={(e) => updateStage.mutate({ id: d._id, stage: e.target.value })}
                  className="select-field w-full text-sm mb-3 disabled:opacity-50"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={sendQuote.isPending}
                    onClick={() => sendQuote.mutate(d._id)}
                    className="chip chip-orange flex-1 justify-center text-sm disabled:opacity-50"
                  >
                    عرض سعر
                  </button>
                  <span className="text-xs text-[var(--muted)] self-center">
                    متابعات: {d.followUpCount || 0}
                  </span>
                </div>
              </div>
            );
          })}
          {!deals.length && (
            <div className="col-span-full">
              <EmptyState
                title="لا صفقات بعد"
                description="ستُنشأ تلقائياً من رسائل واتساب، أو أنشئ صفقة يدوياً لعميل موجود."
                actionLabel="+ صفقة جديدة"
                onAction={() => setShowForm(true)}
                secondaryLabel="فتح الرسائل"
                secondaryHref="/dashboard/inbox"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
