'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EmptyState, PageHeader } from '@/components/ui';
import { Modal } from '@/components/modal';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/utils/debounce';
import { useCreateCustomer, useCustomers } from '@/hooks/useCustomers';

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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', status: 'lead', notes: '' });

  const { data: customers = [], isLoading, isFetching } = useCustomers({
    search: debouncedSearch || undefined,
    status: status || undefined,
  });
  const createCustomer = useCreateCustomer();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomer.mutate(form, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ name: '', phone: '', email: '', status: 'lead', notes: '' });
      },
    });
  };

  return (
    <div className="page-wrap">
      <PageHeader
        title="العملاء (CRM)"
        subtitle={`${customers.length} عميل · تحديث فوري بدون إعادة تحميل`}
        actions={
          <>
            <Link href="/dashboard/inbox" className="btn-ghost text-sm">
              الرسائل
            </Link>
            <button type="button" onClick={() => setShowForm(true)} className="btn-orange text-sm">
              + إضافة عميل
            </button>
          </>
        }
      />

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث حي بالاسم أو الرقم..."
          className="input-field flex-1 min-w-[min(100%,12rem)]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="select-field"
        >
          <option value="">كل الحالات</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {isFetching && !isLoading ? (
          <span className="text-xs text-[var(--muted)]">جاري التحديث...</span>
        ) : null}
      </div>

      <Modal open={showForm} onClose={() => !createCustomer.isPending && setShowForm(false)}>
        <form
          onSubmit={handleCreate}
          className="modal-panel surface-card p-4 sm:p-6 space-y-4"
          style={{ width: 'min(100%, 28rem)' }}
        >
          <h2 className="font-bold text-lg">إضافة عميل جديد</h2>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="الاسم"
            className="input-field"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="رقم واتساب (9665...)"
            className="input-field"
            dir="ltr"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="البريد"
            className="input-field"
            dir="ltr"
          />
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="input-field"
          >
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <div className="flex gap-3 form-actions">
            <button
              type="submit"
              disabled={createCustomer.isPending}
              className="btn-teal flex-1 justify-center disabled:opacity-50"
            >
              {createCustomer.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              disabled={createCustomer.isPending}
              onClick={() => setShowForm(false)}
              className="btn-ghost flex-1 justify-center"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      <div className="table-wrap">
        {isLoading ? (
          <TableSkeleton rows={6} />
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
                      <div className="icon-badge teal text-xs font-bold shrink-0">{c.name.charAt(0)}</div>
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
                    <Link href={`/dashboard/customers/${c._id}`}>{c.totalMessages || 0}</Link>
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
