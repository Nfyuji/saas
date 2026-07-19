'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserRound,
  Building2,
  Shield,
  CreditCard,
  Smartphone,
  Settings,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader, QuickLink } from '@/components/ui';

interface ProfileUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProfileCompany {
  id?: string;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  industry?: string;
  plan?: string;
  planExpiresAt?: string;
  isActive?: boolean;
  sector?: string;
  settings?: Record<string, boolean | string | number | number[] | undefined>;
  whatsapp?: {
    configured?: boolean;
    demo?: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    aiAutoReply?: boolean;
  };
}

interface UsageSnap {
  plan: { name: string; code: string; price: number };
  daysLeft: number | null;
  meters: Array<{ key: string; label: string; used: number; limit: number | null; unlimited: boolean; percent: number | null; status: string }>;
  alerts: Array<{ text: string }>;
}

const roleLabels: Record<string, string> = {
  owner: 'مالك الشركة',
  admin: 'مدير',
  agent: 'موظف مبيعات',
  viewer: 'مشاهد',
  super_admin: 'أدمن المنصة',
  platform_support: 'دعم المنصة',
  platform_finance: 'مالية المنصة',
};

export default function ProfilePage() {
  const { refreshProfile } = useAuth();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [company, setCompany] = useState<ProfileCompany | null>(null);
  const [usage, setUsage] = useState<UsageSnap | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [companyForm, setCompanyForm] = useState({ name: '', phone: '', industry: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [profile, u] = await Promise.all([
        api.get<{ user: ProfileUser; company: ProfileCompany | null }>('/auth/profile'),
        api.get<UsageSnap>('/billing/usage').catch(() => null),
      ]);
      setUser(profile.user);
      setName(profile.user.name || '');
      setCompany(profile.company);
      if (profile.company) {
        setCompanyForm({
          name: profile.company.name || '',
          phone: profile.company.phone || '',
          industry: profile.company.industry || '',
        });
      }
      if (u) setUsage(u);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await api.put<{ message: string; user: ProfileUser }>('/auth/profile', { name });
      setUser(res.user);
      setMessage(res.message || 'تم تحديث الملف الشخصي');
      await refreshProfile();
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: res.user.id || res.user._id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          companyId: company?.id || company?._id || null,
        }),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const updated = await api.put<ProfileCompany>('/companies/me', companyForm);
      setCompany((c) => ({ ...c, ...updated }));
      setMessage('تم حفظ بيانات الشركة');
      await refreshProfile();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل حفظ الشركة');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (password.next !== password.confirm) {
      setMessage('تأكيد كلمة المرور غير متطابق');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put<{ message: string }>('/auth/change-password', {
        currentPassword: password.current,
        newPassword: password.next,
      });
      setMessage(res.message || 'تم تحديث كلمة المرور');
      setPassword({ current: '', next: '', confirm: '' });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل تحديث كلمة المرور');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-wrap empty-state">جاري تحميل الملف الشخصي...</div>;
  }

  const isError = /فشل|غير|خطأ/i.test(message);
  const msgMeter = usage?.meters?.find((m) => m.key === 'messagesPerDay');

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="الملف الشخصي"
        subtitle="حسابك، شركتك، الأمان، ولمحة عن استخدام الباقة"
        eyebrow="Profile"
        actions={
          <Link href="/dashboard/usage" className="btn-teal text-sm">
            <Activity size={15} strokeWidth={2.3} />
            تفاصيل الاستخدام
          </Link>
        }
      />

      {message && <div className={isError ? 'alert-err' : 'alert-ok'}>{message}</div>}

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-[var(--teal)] text-white font-display font-black text-2xl grid place-items-center shrink-0">
            {(user?.name || '?').charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-extrabold text-xl text-[var(--teal-dark)] m-0">
              {user?.name}
            </h2>
            <p className="text-sm text-[var(--muted)] m-0 mt-1" dir="ltr">
              {user?.email}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="badge badge-ok">{roleLabels[user?.role || ''] || user?.role}</span>
              <span className={`badge ${user?.isActive !== false ? 'badge-ok' : 'badge-warn'}`}>
                {user?.isActive !== false ? 'حساب نشط' : 'معطّل'}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 text-sm">
          <div className="rounded-2xl bg-[var(--teal-soft)]/50 px-3 py-2">
            <p className="text-xs text-[var(--muted)] font-bold m-0">آخر دخول</p>
            <p className="font-bold m-0 mt-1">
              {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ar') : '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--teal-soft)]/50 px-3 py-2">
            <p className="text-xs text-[var(--muted)] font-bold m-0">تاريخ الإنشاء</p>
            <p className="font-bold m-0 mt-1">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ar') : '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--orange-soft)]/60 px-3 py-2">
            <p className="text-xs text-[var(--muted)] font-bold m-0">الباقة</p>
            <p className="font-bold m-0 mt-1">
              {usage?.plan?.name || company?.plan || '—'}
              {usage?.daysLeft != null ? ` · ${usage.daysLeft} يوم` : ''}
            </p>
          </div>
        </div>
      </section>

      <div className="quick-grid !mb-0">
        <QuickLink href="/dashboard/usage" title="الاستخدام" desc="حدود الباقة بالتفصيل" icon={Activity} />
        <QuickLink href="/dashboard/billing" title="الاشتراك" desc="ترقية ودفع" tone="orange" icon={CreditCard} />
        <QuickLink href="/dashboard/whatsapp" title="واتساب" desc="الربط والرسائل" icon={Smartphone} />
        <QuickLink href="/dashboard/settings" title="الإعدادات" desc="AI والتشغيل" tone="sky" icon={Settings} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <form onSubmit={saveUser} className="surface-card p-5 sm:p-6 space-y-4">
          <h3 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
            <UserRound size={18} className="text-[var(--teal)]" />
            بيانات الحساب
          </h3>
          <label className="block text-sm font-bold">
            الاسم الظاهر
            <input
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field mt-1.5"
            />
          </label>
          <label className="block text-sm font-bold">
            البريد الإلكتروني
            <input value={user?.email || ''} className="input-field mt-1.5" dir="ltr" disabled />
          </label>
          <p className="text-xs text-[var(--muted)] m-0">
            البريد مربوط بالحساب ولا يُغيَّر من هنا. للتغيير تواصل مع الدعم.
          </p>
          <button type="submit" disabled={saving} className="btn-teal disabled:opacity-50">
            حفظ الاسم
          </button>
        </form>

        <form onSubmit={changePassword} className="surface-card p-5 sm:p-6 space-y-4">
          <h3 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
            <Shield size={18} className="text-[var(--orange)]" />
            الأمان — كلمة المرور
          </h3>
          <label className="block text-sm font-bold">
            الحالية
            <input
              type="password"
              required
              minLength={6}
              value={password.current}
              onChange={(e) => setPassword({ ...password, current: e.target.value })}
              className="input-field mt-1.5"
              dir="ltr"
              autoComplete="current-password"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm font-bold">
              الجديدة
              <input
                type="password"
                required
                minLength={6}
                value={password.next}
                onChange={(e) => setPassword({ ...password, next: e.target.value })}
                className="input-field mt-1.5"
                dir="ltr"
                autoComplete="new-password"
              />
            </label>
            <label className="block text-sm font-bold">
              تأكيد
              <input
                type="password"
                required
                minLength={6}
                value={password.confirm}
                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                className="input-field mt-1.5"
                dir="ltr"
                autoComplete="new-password"
              />
            </label>
          </div>
          <button type="submit" disabled={saving} className="btn-orange disabled:opacity-50">
            تحديث كلمة المرور
          </button>
        </form>
      </div>

      {company && (
        <form onSubmit={saveCompany} className="surface-card p-5 sm:p-6 space-y-4">
          <h3 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
            <Building2 size={18} className="text-[var(--teal)]" />
            بيانات الشركة
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm font-bold sm:col-span-2">
              اسم الشركة
              <input
                required
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                className="input-field mt-1.5"
              />
            </label>
            <label className="block text-sm font-bold">
              هاتف الشركة
              <input
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                className="input-field mt-1.5"
                dir="ltr"
              />
            </label>
            <label className="block text-sm font-bold">
              المجال
              <input
                value={companyForm.industry}
                onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                className="input-field mt-1.5"
                placeholder="تجارة، خدمات، عقارات..."
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl border border-[var(--border)] px-3 py-2">
              <p className="text-xs text-[var(--muted)] font-bold m-0">القطاع</p>
              <p className="font-bold m-0 mt-1">{company.sector || 'general'}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] px-3 py-2">
              <p className="text-xs text-[var(--muted)] font-bold m-0">واتساب</p>
              <p className="font-bold m-0 mt-1">
                {!company.whatsapp?.configured
                  ? 'غير مربوط'
                  : company.whatsapp.demo
                    ? 'تجريبي'
                    : company.whatsapp.displayPhoneNumber || 'متصل'}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] px-3 py-2">
              <p className="text-xs text-[var(--muted)] font-bold m-0">انتهاء الباقة</p>
              <p className="font-bold m-0 mt-1">
                {company.planExpiresAt
                  ? new Date(company.planExpiresAt).toLocaleDateString('ar')
                  : '—'}
              </p>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-teal disabled:opacity-50">
            حفظ بيانات الشركة
          </button>
        </form>
      )}

      {usage && (
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <h3 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
              <Activity size={18} className="text-[var(--orange)]" />
              لمحة الاستخدام
            </h3>
            <Link href="/dashboard/usage" className="text-xs font-bold text-[var(--teal)]">
              عرض التفاصيل كاملة
            </Link>
          </div>
          {msgMeter && (
            <div className="mb-4">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span>رسائل اليوم</span>
                <span dir="ltr">
                  {msgMeter.used}
                  {msgMeter.unlimited ? '' : `/${msgMeter.limit}`}
                </span>
              </div>
              {!msgMeter.unlimited && (
                <span className="usage-chip-bar" aria-hidden>
                  <span
                    className={`usage-chip-fill ${
                      msgMeter.status === 'danger'
                        ? 'is-danger'
                        : msgMeter.status === 'warn'
                          ? 'is-warn'
                          : ''
                    }`}
                    style={{ width: `${msgMeter.percent ?? 0}%` }}
                  />
                </span>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {usage.meters.slice(0, 4).map((m) => (
              <div key={m.key} className="rounded-2xl bg-[var(--teal-soft)]/40 px-3 py-2 text-sm">
                <p className="text-xs text-[var(--muted)] font-bold m-0">{m.label}</p>
                <p className="font-bold m-0 mt-1" dir="ltr">
                  {m.used}
                  {m.unlimited ? ' · ∞' : ` / ${m.limit}`}
                </p>
              </div>
            ))}
          </div>
          {usage.alerts?.[0] && (
            <p className="text-sm text-[var(--orange-dark)] font-bold mt-4 mb-0">
              {usage.alerts[0].text}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
