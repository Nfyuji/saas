'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/ui';
import { Modal } from '@/components/modal';

interface Invoice {
  _id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  paymentLink?: string;
  dueDate?: string;
  customerId?: { name: string; phone?: string };
}

const statusBadges: Record<string, string> = {
  paid: 'badge-ok',
  sent: 'badge-warn',
  overdue: 'badge-warn',
  draft: 'badge-off',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<{ revenue: number; paid: number; sent: number; overdue: number } | null>(null);
  const [customers, setCustomers] = useState<Array<{ _id: string; name: string }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerId: '', name: '', price: 0 });

  const load = () => {
    api.get<Invoice[]>('/invoices').then(setInvoices).catch(console.error);
    api.get<{ revenue: number; paid: number; sent: number; overdue: number }>('/invoices/stats').then(setStats).catch(console.error);
  };

  useEffect(() => {
    load();
    api.get<{ data: Array<{ _id: string; name: string }> }>('/customers?limit=100')
      .then((r) => setCustomers(r.data)).catch(console.error);
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/invoices', {
      customerId: form.customerId,
      items: [{ name: form.name, quantity: 1, price: Number(form.price) }],
    });
    setShowForm(false);
    load();
  };

  const sendWa = async (id: string) => {
    const res = await api.get<{ message: string }>(`/invoices/${id}/whatsapp-message`);
    await api.put(`/invoices/${id}/send`);
    alert(res.message);
    load();
  };

  return (
    <div className="page-wrap">
      <PageHeader
        title="الفواتير والتحصيل"
        subtitle="أنشئ فاتورة وأرسل رابط الدفع عبر واتساب"
        actions={
          <button type="button" onClick={() => setShowForm(true)} className="btn-orange text-sm">
            + فاتورة
          </button>
        }
      />

      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'الإيراد المحصّل', value: stats?.revenue ?? 0 },
          { label: 'مدفوعة', value: stats?.paid ?? 0 },
          { label: 'مُرسلة', value: stats?.sent ?? 0 },
          { label: 'متأخرة', value: stats?.overdue ?? 0 },
        ].map((c) => (
          <div key={c.label} className="surface-card p-4">
            <p className="text-2xl font-bold">{Number(c.value).toLocaleString('ar')}</p>
            <p className="text-xs text-[var(--muted)]">{c.label}</p>
          </div>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={create} className="modal-panel surface-card p-4 sm:p-6 space-y-3" style={{ width: 'min(100%, 28rem)' }}>
          <h2 className="font-bold text-lg">فاتورة جديدة</h2>
          <select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            className="input-field">
            <option value="">اختر عميلاً</option>
            {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="وصف الخدمة/المنتج" className="input-field" />
          <input type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            placeholder="السعر" className="input-field" />
          <div className="flex gap-3 form-actions">
            <button type="submit" className="btn-teal flex-1 justify-center">إنشاء</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">إلغاء</button>
          </div>
        </form>
      </Modal>

      <div className="table-wrap">
        {invoices.length === 0 ? (
          <EmptyState
            title="لا فواتير بعد"
            description={
              customers.length
                ? 'أنشئ أول فاتورة لعميل موجود وأرسلها عبر واتساب.'
                : 'أضف عميلاً أولاً، ثم أنشئ فاتورة ورابط تحصيل.'
            }
            actionLabel={customers.length ? '+ فاتورة جديدة' : '+ إضافة عميل'}
            onAction={customers.length ? () => setShowForm(true) : undefined}
            actionHref={customers.length ? undefined : '/dashboard/customers'}
            secondaryLabel="الصفقات"
            secondaryHref="/dashboard/deals"
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>الرقم</th>
                <th>العميل</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td className="font-mono text-xs" dir="ltr">{inv.number}</td>
                  <td>{inv.customerId?.name}</td>
                  <td className="font-semibold">{inv.total} {inv.currency}</td>
                  <td>
                    <span className={`badge ${statusBadges[inv.status] || 'badge-off'}`}>{inv.status}</span>
                  </td>
                  <td className="space-x-2 space-x-reverse">
                    <button onClick={() => sendWa(inv._id)} className="chip chip-teal text-xs">رسالة واتساب</button>
                    {inv.status !== 'paid' && (
                      <button onClick={() => api.put(`/invoices/${inv._id}/paid`).then(load)} className="chip chip-soft text-xs">تأكيد دفع</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
