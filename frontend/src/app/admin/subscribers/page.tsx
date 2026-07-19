'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Subscriber {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  plan: string;
  isActive: boolean;
  sector?: string;
  planExpiresAt?: string;
  usersCount: number;
  customersCount: number;
}

interface PlanOption {
  _id: string;
  code: string;
  name: string;
  price: number;
}

export default function SubscribersPage() {
  const [list, setList] = useState<Subscriber[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    password: '123456',
    phone: '',
    plan: 'starter',
    sector: 'general',
    days: 30,
  });

  const load = () => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    if (plan) q.set('plan', plan);
    api
      .get<Subscriber[]>(`/platform-admin/subscribers?${q}`)
      .then(setList)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get<PlanOption[]>('/platform-admin/plans').then(setPlans).catch(console.error);
  }, [status, plan]);

  const setCompanyPlan = async (id: string, planId: string) => {
    await api.put(`/platform-admin/subscribers/${id}/plan`, { planId, days: 30 });
    setMessage(`تم تحديث الباقة إلى ${planId}`);
    load();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    let reason: string | undefined;
    if (!isActive) {
      reason = prompt('سبب إيقاف المشترك؟') || 'موقوف من الأدمن';
    }
    await api.put(`/platform-admin/subscribers/${id}/status`, { isActive, reason });
    setMessage(isActive ? 'تم تفعيل المشترك' : 'تم إيقاف المشترك');
    load();
  };

  const extend = async (id: string) => {
    await api.put(`/platform-admin/subscribers/${id}/extend`, { days: 30 });
    setMessage('تم تمديد الاشتراك 30 يوماً');
    load();
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/platform-admin/subscribers', form);
      setMessage('تم إنشاء المشترك بنجاح');
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الإنشاء');
    }
  };

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="page-title">المشتركون</h1>
          <p className="page-sub">{list.length} شركة · تحكم كامل بالاشتراكات</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={async () => {
              const res = await api.get<{ csv: string; filename: string }>('/platform-admin/export/subscribers.csv');
              const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = res.filename;
              a.click();
            }}
            className="btn-ghost text-sm"
          >
            تصدير CSV
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-orange text-sm !py-2.5">
            + إضافة مشترك
          </button>
        </div>
      </div>

      {message && <div className="alert-ok">{message}</div>}
      {error && !showCreate && <div className="alert-err">{error}</div>}

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="بحث بالاسم أو الإيميل..."
          className="input-field flex-1 min-w-[min(100%,12rem)]"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-full sm:w-auto min-w-0 sm:min-w-[8.5rem]">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="suspended">موقوف</option>
          <option value="expired">منتهي</option>
        </select>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="input-field w-full sm:w-auto min-w-0 sm:min-w-[8.5rem]">
          <option value="">كل الباقات</option>
          {plans.map((p) => (
            <option key={p._id} value={p.code}>{p.name} ({p.code})</option>
          ))}
        </select>
        <button onClick={load} className="btn-teal text-sm !py-2.5">بحث</button>
      </div>

      <div className="table-wrap">
        {loading ? (
          <p className="empty-state">جاري التحميل...</p>
        ) : list.length === 0 ? (
          <p className="empty-state">لا مشتركين بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>الشركة</th>
                  <th>الباقة</th>
                  <th>الحالة</th>
                  <th>المستخدمون</th>
                  <th>الانتهاء</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <Link href={`/admin/subscribers/${s._id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] font-bold text-xs">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--teal-dark)]">{s.name}</p>
                          <p className="text-xs text-[var(--muted)]">{s.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <select
                        value={s.plan}
                        onChange={(e) => setCompanyPlan(s._id, e.target.value)}
                        className="input-field !py-1.5 !px-2 text-sm w-auto"
                      >
                        {plans.map((p) => (
                          <option key={p._id} value={p.code}>{p.name}</option>
                        ))}
                        {!plans.find((p) => p.code === s.plan) && (
                          <option value={s.plan}>{s.plan}</option>
                        )}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${s.isActive ? 'badge-ok' : 'badge-warn'}`}>
                        {s.isActive ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td>{s.usersCount} · عملاء {s.customersCount}</td>
                    <td className="text-[var(--muted)]">
                      {s.planExpiresAt ? new Date(s.planExpiresAt).toLocaleDateString('ar') : '—'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => extend(s._id)} className="chip chip-teal text-xs">+30 يوم</button>
                        <button
                          onClick={() => toggleActive(s._id, !s.isActive)}
                          className={`chip text-xs ${s.isActive ? 'chip-orange' : 'chip-teal'}`}
                        >
                          {s.isActive ? 'إيقاف' : 'تفعيل'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <form onSubmit={create} className="modal-panel surface-card p-4 sm:p-6 space-y-3" style={{ width: 'min(100%, 36rem)' }}>
            <h2 className="page-title text-lg">إضافة مشترك جديد</h2>
            {error && <div className="alert-err !mb-0">{error}</div>}
            <input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="اسم الشركة" className="input-field" />
            <input required value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="اسم المالك" className="input-field" />
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="البريد" className="input-field" dir="ltr" />
            <input required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="كلمة المرور" className="input-field" dir="ltr" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="الجوال" className="input-field" dir="ltr" />
            <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="input-field">
              {plans.map((p) => (
                <option key={p._id} value={p.code}>{p.name} — ${p.price}</option>
              ))}
            </select>
            <input type="number" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} placeholder="مدة الاشتراك بالأيام" className="input-field" />
            <div className="flex gap-3 form-actions">
              <button type="submit" className="btn-teal flex-1">إنشاء</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
