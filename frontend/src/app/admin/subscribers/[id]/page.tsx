'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Detail {
  company: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    plan: string;
    sector?: string;
    isActive: boolean;
    planExpiresAt?: string;
    suspendedReason?: string;
    whatsapp?: { displayPhoneNumber?: string; configured?: boolean };
    settings?: { adminNotes?: string; aiInstructions?: string };
  };
  users: Array<{ _id: string; name: string; email: string; role: string; lastLoginAt?: string }>;
  customersCount: number;
  messagesCount: number;
  invoices: Array<{ _id: string; number: string; total: number; status: string; currency: string }>;
  usage?: Record<string, number>;
  limits?: Record<string, number>;
  isExpired?: boolean;
  planMeta?: { name: string; price: number; features: string[] };
}

export default function SubscriberDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [notes, setNotes] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [extendDays, setExtendDays] = useState(30);
  const [suspendReason, setSuspendReason] = useState('');
  const [message, setMessage] = useState('');
  const [plans, setPlans] = useState<Array<{ code: string; name: string }>>([]);

  const load = () => {
    api.get<Detail>(`/platform-admin/subscribers/${id}`).then((res) => {
      setData(res);
      setNotes(res.company.settings?.adminNotes || '');
    });
    api.get<Array<{ code: string; name: string }>>('/platform-admin/plans').then(setPlans).catch(console.error);
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!data) return <div className="page-wrap animate-pulse text-[var(--muted)]">جاري التحميل...</div>;

  const c = data.company;

  const saveNotes = async () => {
    await api.put(`/platform-admin/subscribers/${id}/notes`, { notes });
    setMessage('تم حفظ الملاحظات');
  };

  const toggle = async () => {
    if (c.isActive) {
      const reason = suspendReason || prompt('سبب الإيقاف؟') || 'موقوف من الأدمن';
      await api.put(`/platform-admin/subscribers/${id}/status`, { isActive: false, reason });
      setMessage('تم الإيقاف');
    } else {
      await api.put(`/platform-admin/subscribers/${id}/status`, { isActive: true });
      setMessage('تم التفعيل');
    }
    load();
  };

  const usageRows = [
    ['conversations', 'المحادثات/الرسائل'],
    ['knowledgeDocs', 'مستندات المعرفة'],
    ['teamUsers', 'أعضاء الفريق'],
    ['whatsappNumbers', 'أرقام واتساب'],
  ] as const;

  return (
    <div className="page-wrap">
      <div className="mb-6">
        <Link href="/admin/subscribers" className="text-sm text-[var(--teal)] font-bold">← رجوع للمشتركين</Link>
      </div>

      {message && <div className="alert-ok">{message}</div>}

      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="icon-badge teal text-2xl font-bold">
            {c.name.charAt(0)}
          </div>
          <div>
            <h1 className="page-title">{c.name}</h1>
            <p className="page-sub">{c.email} · {c.phone || '—'}</p>
            <p className="text-xs text-[var(--muted)] mt-1">قطاع: {c.sector || '—'} · باقة: {c.plan}</p>
            {c.suspendedReason && !c.isActive && (
              <p className="text-xs text-[var(--orange-dark)] mt-1">سبب الإيقاف: {c.suspendedReason}</p>
            )}
            {data.isExpired && (
              <span className="badge badge-warn mt-1">⚠ الاشتراك منتهي الصلاحية</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={c.plan}
            onChange={(e) =>
              api.put(`/platform-admin/subscribers/${id}/plan`, { planId: e.target.value, days: extendDays }).then(() => {
                setMessage('تم تغيير الباقة');
                load();
              })
            }
            className="input-field w-auto text-sm"
          >
            {plans.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={extendDays}
            onChange={(e) => setExtendDays(Number(e.target.value))}
            className="input-field w-20 text-sm"
            title="أيام التمديد"
          />
          <button
            onClick={async () => {
              const res = await api.post<{ accessToken: string; user: { id: string }; note?: string }>(
                `/platform-admin/subscribers/${id}/impersonate`,
              );
              localStorage.setItem('token', res.accessToken);
              localStorage.setItem('user', JSON.stringify(res.user));
              localStorage.setItem('impersonating', '1');
              setMessage(res.note || 'تم الدخول كالمالك');
              window.location.href = '/dashboard';
            }}
            className="btn-orange text-sm !py-2.5"
          >
            دخول كالمالك
          </button>
          <button
            onClick={async () => {
              if (!confirm('أرشفة الشركة؟')) return;
              await api.put(`/platform-admin/subscribers/${id}/archive`, { archive: true });
              setMessage('تمت الأرشفة');
              load();
            }}
            className="btn-ghost text-sm"
          >
            أرشفة
          </button>
          <button onClick={toggle} className={`text-sm ${c.isActive ? 'chip chip-orange' : 'chip chip-teal'}`}>
            {c.isActive ? 'إيقاف الاشتراك' : 'تفعيل الاشتراك'}
          </button>
          <button
            onClick={() => api.put(`/platform-admin/subscribers/${id}/extend`, { days: extendDays }).then(() => { setMessage(`+${extendDays} يوم`); load(); })}
            className="btn-teal text-sm !py-2.5"
          >
            تمديد {extendDays} يوم
          </button>
        </div>
      </div>

      {c.isActive && (
        <div className="mb-6 flex gap-2 items-center">
          <input
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="سبب الإيقاف (اختياري قبل الإيقاف)"
            className="input-field flex-1 text-sm"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'المستخدمون', value: data.users.length },
          { label: 'العملاء', value: data.customersCount },
          { label: 'الرسائل', value: data.messagesCount },
          { label: 'الانتهاء', value: c.planExpiresAt ? new Date(c.planExpiresAt).toLocaleDateString('ar') : '—' },
        ].map((card) => (
          <div key={card.label} className="surface-card p-5">
            <p className="font-display text-2xl font-black text-[var(--teal-dark)]">{card.value}</p>
            <p className="text-[var(--muted)] text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="surface-card p-6 mb-6">
        <h2 className="font-display font-extrabold text-lg mb-4 text-[var(--teal-dark)]">الاستخدام مقابل حدود الباقة</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {usageRows.map(([key, label]) => {
            const used = data.usage?.[key] ?? 0;
            const limit = data.limits?.[key];
            const unlimited = limit == null || limit < 0;
            const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{label}</span>
                  <span className="text-[var(--muted)]">
                    {used} / {unlimited ? '∞' : limit}
                  </span>
                </div>
                <div className="h-2 bg-[var(--teal-soft)]/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct > 90 ? 'bg-[var(--orange)]' : 'bg-[var(--teal)]'}`}
                    style={{ width: unlimited ? '8%' : `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="surface-card p-6">
          <h2 className="font-display font-extrabold text-lg mb-4 text-[var(--teal-dark)]">مستخدمو الشركة</h2>
          <div className="space-y-3">
            {data.users.map((u) => (
              <div key={u._id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--teal-soft)]/30">
                <div className="icon-badge teal text-sm font-bold">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-xs text-[var(--muted)]">{u.email}</p>
                </div>
                <span className="badge badge-off">{u.role}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card p-6">
            <h2 className="font-display font-extrabold text-lg mb-4 text-[var(--teal-dark)]">آخر الفواتير</h2>
            {data.invoices.length ? data.invoices.map((inv) => (
              <div key={inv._id} className="flex justify-between py-2 border-b border-[var(--border)] text-sm">
                <span dir="ltr">{inv.number}</span>
                <span>{inv.total} {inv.currency}</span>
                <span className={`badge ${inv.status === 'paid' ? 'badge-ok' : 'badge-warn'}`}>{inv.status}</span>
              </div>
            )) : <p className="empty-state !py-4">لا فواتير</p>}
          </div>

          <div className="surface-card p-6">
            <h2 className="font-display font-extrabold text-lg mb-3 text-[var(--teal-dark)]">ملاحظات الأدمن</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="input-field mb-3"
              placeholder="ملاحظات داخلية عن هذا المشترك..."
            />
            <button onClick={saveNotes} className="btn-teal text-sm">
              حفظ الملاحظات
            </button>
          </div>

          <div className="surface-card p-6">
            <h2 className="font-display font-extrabold text-lg mb-3 text-[var(--teal-dark)]">إعادة تعيين كلمة مرور المالك</h2>
            <div className="flex gap-2">
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="كلمة مرور جديدة"
                className="input-field flex-1"
                dir="ltr"
              />
              <button
                onClick={async () => {
                  if (newPassword.length < 6) return setMessage('كلمة المرور قصيرة');
                  await api.put(`/platform-admin/subscribers/${id}/reset-password`, { password: newPassword });
                  setMessage('تم تغيير كلمة المرور');
                  setNewPassword('');
                }}
                className="btn-orange text-sm !py-2.5"
              >
                تحديث
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
