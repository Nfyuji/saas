'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/ui';
import { Modal } from '@/components/modal';

interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  status: string;
  tags: string[];
  totalMessages: number;
  lastContactAt?: string;
  notes?: string;
}

const statusLabels: Record<string, string> = {
  lead: 'عميل محتمل',
  prospect: 'مهتم',
  customer: 'عميل',
  vip: 'VIP',
  inactive: 'غير نشط',
};

const statusBadges: Record<string, string> = {
  lead: 'badge-warn',
  prospect: 'badge-ok',
  customer: 'badge-ok',
  vip: 'badge-warn',
  inactive: 'badge-off',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', status: 'lead', notes: '' });

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api.get<{ data: Customer[] }>(`/customers?${params}`)
      .then((res) => setCustomers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/customers', form);
      setShowForm(false);
      setForm({ name: '', phone: '', email: '', status: 'lead', notes: '' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل الإنشاء');
    }
  };

  return (
    <div className="page-wrap">
      <PageHeader
        title="العملاء (CRM)"
        subtitle={`${customers.length} عميل · كل محادثة واتساب تُربط هنا`}
        actions={
          <>
            <Link href="/dashboard/inbox" className="btn-ghost text-sm">الرسائل</Link>
            <button type="button" onClick={() => setShowForm(true)} className="btn-orange text-sm">
              + إضافة عميل
            </button>
          </>
        }
      />

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="بحث بالاسم أو الرقم..."
          className="input-field flex-1 min-w-[min(100%,12rem)]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="select-field"
        >
          <option value="">كل الحالات</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="button" onClick={load} className="btn-ghost">
          بحث
        </button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleCreate} className="modal-panel surface-card p-4 sm:p-6 space-y-4" style={{ width: 'min(100%, 28rem)' }}>
          <h2 className="font-bold text-lg">إضافة عميل جديد</h2>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="الاسم" className="input-field" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="رقم واتساب (9665...)" className="input-field" dir="ltr" />
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="البريد" className="input-field" dir="ltr" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="input-field">
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="flex gap-3 form-actions">
            <button type="submit" className="btn-teal flex-1 justify-center">حفظ</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">إلغاء</button>
          </div>
        </form>
      </Modal>

      <div className="table-wrap">
        {loading ? (
          <p className="empty-state">جاري التحميل...</p>
        ) : customers.length === 0 ? (
          <EmptyState
            title="لا عملاء بعد"
            description="أضف عميلاً يدوياً، أو اربط واتساب ليُنشأ العملاء تلقائياً من الرسائل الواردة."
            actionLabel="+ إضافة عميل"
            onAction={() => setShowForm(true)}
            secondaryLabel="ربط واتساب"
            secondaryHref="/dashboard/whatsapp"
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>العميل</th>
                <th>الهاتف</th>
                <th>الحالة</th>
                <th>الرسائل</th>
                <th>آخر تواصل</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className="cursor-pointer hover:bg-[var(--teal-soft)]/30 transition">
                  <td>
                    <Link href={`/dashboard/customers/${c._id}`} className="flex items-center gap-3 min-w-0">
                      <div className="icon-badge teal text-xs font-bold shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.name}</p>
                        {c.email && <p className="text-xs text-[var(--muted)] truncate">{c.email}</p>}
                      </div>
                    </Link>
                  </td>
                  <td dir="ltr">
                    <Link href={`/dashboard/customers/${c._id}`} className="hover:text-[var(--teal)]">
                      {c.phone || '—'}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/dashboard/customers/${c._id}`}>
                      <span className={`badge ${statusBadges[c.status] || 'badge-off'}`}>
                        {statusLabels[c.status] || c.status}
                      </span>
                    </Link>
                  </td>
                  <td>
                    <Link href={`/dashboard/customers/${c._id}`}>{c.totalMessages}</Link>
                  </td>
                  <td className="text-[var(--muted)]">
                    <Link href={`/dashboard/customers/${c._id}`}>
                      {c.lastContactAt ? new Date(c.lastContactAt).toLocaleDateString('ar') : '—'}
                    </Link>
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
