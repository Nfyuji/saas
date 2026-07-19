'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Settings {
  platformName: string;
  supportMessage?: string;
  supportEmail?: string;
  allowRegistration: boolean;
  trialEnabled: boolean;
  trialDays: number;
  defaultPlanCode: string;
  maintenanceMode: boolean;
}

interface PlanOption {
  code: string;
  name: string;
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [health, setHealth] = useState<{ status: string; checks?: { api: boolean; mongodb: boolean } } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Settings>('/platform-admin/settings').then(setForm).catch(console.error);
    api.get<PlanOption[]>('/platform-admin/plans').then((p) => setPlans(p.map((x) => ({ code: x.code, name: x.name })))).catch(console.error);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'down' }));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setError('');
    try {
      await api.put('/platform-admin/settings', form);
      setMessage('تم حفظ إعدادات المنصة');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  };

  if (!form) return <div className="page-wrap animate-pulse text-[var(--muted)]">جاري التحميل...</div>;

  return (
    <div className="page-wrap max-w-3xl">
      <div className="mb-8">
        <h1 className="page-title">إعدادات المنصة</h1>
        <p className="page-sub">تحكم كامل بإعدادات التسجيل والتجربة والصيانة</p>
      </div>

      {message && <div className="alert-ok">{message}</div>}
      {error && <div className="alert-err">{error}</div>}

      <div className="surface-card p-6 mb-6">
        <h2 className="font-display font-extrabold text-lg mb-4 text-[var(--teal-dark)]">صحة النظام</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[var(--teal-soft)]/30">
            <p className="text-xs text-[var(--muted)] mb-1">API</p>
            <span className={`badge ${health?.status === 'ok' ? 'badge-ok' : 'badge-warn'}`}>
              {health?.status === 'ok' ? 'يعمل' : 'متوقف'}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[var(--teal-soft)]/30">
            <p className="text-xs text-[var(--muted)] mb-1">MongoDB</p>
            <span className={`badge ${health?.checks?.mongodb ? 'badge-ok' : 'badge-warn'}`}>
              {health?.checks?.mongodb ? 'متصل' : 'غير متصل'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="surface-card p-6 space-y-4">
        <input
          value={form.platformName}
          onChange={(e) => setForm({ ...form, platformName: e.target.value })}
          className="input-field"
          placeholder="اسم المنصة"
        />
        <input
          value={form.supportEmail || ''}
          onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
          className="input-field"
          placeholder="إيميل الدعم"
          dir="ltr"
        />
        <textarea
          value={form.supportMessage || ''}
          onChange={(e) => setForm({ ...form, supportMessage: e.target.value })}
          className="input-field"
          rows={3}
          placeholder="رسالة الدعم / الترحيب"
        />

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">
            أيام التجربة
            <input
              type="number"
              value={form.trialDays}
              onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })}
              className="input-field mt-1"
            />
          </label>
          <label className="text-sm">
            الباقة الافتراضية
            <select
              value={form.defaultPlanCode}
              onChange={(e) => setForm({ ...form, defaultPlanCode: e.target.value })}
              className="input-field mt-1"
            >
              {plans.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.allowRegistration} onChange={(e) => setForm({ ...form, allowRegistration: e.target.checked })} />
            السماح بالتسجيل العام
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.trialEnabled} onChange={(e) => setForm({ ...form, trialEnabled: e.target.checked })} />
            تفعيل الفترة التجريبية
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.maintenanceMode} onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })} />
            وضع الصيانة
          </label>
        </div>

        <button type="submit" className="btn-teal w-full">
          حفظ الإعدادات
        </button>
      </form>
    </div>
  );
}
