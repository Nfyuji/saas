'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  MessageCircle,
  Handshake,
  Receipt,
  Phone,
  Mail,
  Save,
} from 'lucide-react';
import { api } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/ui';

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
  whatsappId?: string;
  createdAt?: string;
}

interface Conversation {
  _id: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: string;
}

interface Deal {
  _id: string;
  title?: string;
  stage: string;
  value?: number;
  updatedAt?: string;
}

interface Invoice {
  _id: string;
  number?: string;
  total?: number;
  status: string;
  createdAt?: string;
}

const statusLabels: Record<string, string> = {
  lead: 'عميل محتمل',
  prospect: 'مهتم',
  customer: 'عميل',
  vip: 'VIP',
  inactive: 'غير نشط',
};

const stageLabels: Record<string, string> = {
  lead: 'Lead',
  qualified: 'مؤهل',
  proposal: 'عرض',
  negotiation: 'تفاوض',
  won: 'مكسوب',
  lost: 'ضائع',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const id = String(params.id || '');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    status: 'lead',
    notes: '',
  });

  const load = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<Customer>(`/customers/${id}`),
      api.get<Conversation[]>(`/conversations?customerId=${id}`).catch(() => []),
      api.get<Deal[]>(`/deals?customerId=${id}`).catch(() => []),
      api.get<Invoice[]>(`/invoices?customerId=${id}`).catch(() => []),
    ])
      .then(([c, conv, d, inv]) => {
        setCustomer(c);
        setForm({
          name: c.name || '',
          phone: c.phone || '',
          email: c.email || '',
          status: c.status || 'lead',
          notes: c.notes || '',
        });
        setConversations(Array.isArray(conv) ? conv : []);
        setDeals(Array.isArray(d) ? d : []);
        setInvoices(Array.isArray(inv) ? inv : []);
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : 'فشل التحميل');
        setCustomer(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const updated = await api.put<Customer>(`/customers/${id}`, form);
      setCustomer(updated);
      setMessage('تم حفظ بيانات العميل');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-wrap empty-state">جاري تحميل ملف العميل...</div>;
  }

  if (!customer) {
    return (
      <div className="page-wrap">
        <EmptyState
          title="العميل غير موجود"
          description={message || 'تحقق من الرابط أو عد إلى قائمة العملاء.'}
          actionLabel="العودة للعملاء"
          actionHref="/dashboard/customers"
        />
      </div>
    );
  }

  const openInbox = conversations[0]
    ? `/dashboard/inbox?id=${conversations[0]._id}`
    : '/dashboard/inbox';

  return (
    <div className="page-wrap">
      <PageHeader
        title={customer.name}
        subtitle={`ملف 360° · ${statusLabels[customer.status] || customer.status}${
          customer.phone ? ` · ${customer.phone}` : ''
        }`}
        actions={
          <>
            <Link href="/dashboard/customers" className="btn-ghost text-sm">
              <ArrowRight size={15} strokeWidth={2.3} />
              العملاء
            </Link>
            <Link href={openInbox} className="btn-teal text-sm">
              <MessageCircle size={15} strokeWidth={2.3} />
              فتح المحادثة
            </Link>
          </>
        }
      />

      {message && (
        <div className={message.includes('فشل') ? 'alert-err mb-4' : 'alert-ok mb-4'}>{message}</div>
      )}

      <div className="stat-grid mb-6">
        <div className="mode-card !p-4">
          <p className="text-xs text-[var(--muted)] font-bold">الرسائل</p>
          <p className="font-display text-2xl font-black text-[var(--teal-dark)] mt-1">
            {customer.totalMessages}
          </p>
        </div>
        <div className="mode-card !p-4">
          <p className="text-xs text-[var(--muted)] font-bold">صفقات</p>
          <p className="font-display text-2xl font-black text-[var(--teal-dark)] mt-1">{deals.length}</p>
        </div>
        <div className="mode-card !p-4">
          <p className="text-xs text-[var(--muted)] font-bold">فواتير</p>
          <p className="font-display text-2xl font-black text-[var(--teal-dark)] mt-1">{invoices.length}</p>
        </div>
        <div className="mode-card !p-4">
          <p className="text-xs text-[var(--muted)] font-bold">آخر تواصل</p>
          <p className="font-bold text-sm mt-2">
            {customer.lastContactAt
              ? new Date(customer.lastContactAt).toLocaleString('ar')
              : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form onSubmit={save} className="surface-card p-5 sm:p-6 space-y-3 xl:col-span-1">
          <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0">البيانات</h2>
          <label className="block text-sm font-bold">
            الاسم
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field mt-1.5"
            />
          </label>
          <label className="block text-sm font-bold">
            <span className="inline-flex items-center gap-1.5">
              <Phone size={14} /> الهاتف (واتساب)
            </span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field mt-1.5"
              dir="ltr"
              placeholder="9665..."
            />
          </label>
          <label className="block text-sm font-bold">
            <span className="inline-flex items-center gap-1.5">
              <Mail size={14} /> البريد
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field mt-1.5"
              dir="ltr"
            />
          </label>
          <label className="block text-sm font-bold">
            الحالة
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="input-field mt-1.5"
            >
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold">
            ملاحظات
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field mt-1.5"
              rows={4}
            />
          </label>
          {customer.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customer.tags.map((t) => (
                <span key={t} className="chip-orange text-xs">
                  {t}
                </span>
              ))}
            </div>
          )}
          <button type="submit" disabled={saving} className="btn-teal w-full justify-center disabled:opacity-50">
            <Save size={15} strokeWidth={2.3} />
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </form>

        <div className="xl:col-span-2 space-y-5">
          <section className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
                <MessageCircle size={18} className="text-[var(--teal)]" />
                المحادثات
              </h2>
              <Link href={openInbox} className="text-xs font-bold text-[var(--teal)]">
                الصندوق
              </Link>
            </div>
            {conversations.length ? (
              <div className="space-y-1">
                {conversations.map((c) => (
                  <Link
                    key={c._id}
                    href={`/dashboard/inbox?id=${c._id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl hover:bg-[var(--teal-soft)]/40 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{c.lastMessage || '—'}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString('ar') : '—'}
                        {c.unreadCount > 0 ? ` · ${c.unreadCount} غير مقروء` : ''}
                      </p>
                    </div>
                    <span className="badge badge-ok shrink-0">{c.status}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">لا محادثات بعد لهذا العميل.</p>
            )}
          </section>

          <section className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
                <Handshake size={18} className="text-[var(--orange)]" />
                الصفقات
              </h2>
              <Link href="/dashboard/deals" className="text-xs font-bold text-[var(--teal)]">
                الكل
              </Link>
            </div>
            {deals.length ? (
              <div className="table-wrap !shadow-none !border-0">
                <table>
                  <thead>
                    <tr>
                      <th>العنوان</th>
                      <th>المرحلة</th>
                      <th>القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((d) => (
                      <tr key={d._id}>
                        <td>{d.title || 'صفقة'}</td>
                        <td>{stageLabels[d.stage] || d.stage}</td>
                        <td>{Number(d.value || 0).toLocaleString('ar')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">لا صفقات بعد.</p>
            )}
          </section>

          <section className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
                <Receipt size={18} className="text-[var(--teal)]" />
                الفواتير
              </h2>
              <Link href="/dashboard/invoices" className="text-xs font-bold text-[var(--teal)]">
                الكل
              </Link>
            </div>
            {invoices.length ? (
              <div className="table-wrap !shadow-none !border-0">
                <table>
                  <thead>
                    <tr>
                      <th>الرقم</th>
                      <th>المبلغ</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv._id}>
                        <td dir="ltr">{inv.number || inv._id.slice(-6)}</td>
                        <td>{Number(inv.total || 0).toLocaleString('ar')}</td>
                        <td>
                          <span
                            className={`badge ${
                              inv.status === 'paid'
                                ? 'badge-ok'
                                : inv.status === 'pending'
                                  ? 'badge-warn'
                                  : 'badge-off'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">لا فواتير بعد.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
