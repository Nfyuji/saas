'use client';

import { useEffect, useState } from 'react';
import { UserRound, Shield, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui';

interface ProfileUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

const roleLabels: Record<string, string> = {
  super_admin: 'أدمن المنصة',
  platform_support: 'دعم المنصة',
  platform_finance: 'مالية المنصة',
};

export default function AdminProfilePage() {
  const { refreshProfile } = useAuth();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const profile = await api.get<{ user: ProfileUser }>('/auth/profile');
      setUser(profile.user);
      setName(profile.user.name || '');
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
          companyId: null,
        }),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (password.next.length < 6) {
      setMessage('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
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

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="الملف الشخصي"
        subtitle="بيانات حساب أدمن المنصة وتغيير كلمة المرور"
        eyebrow="Admin Profile"
      />

      {message && <div className={isError ? 'alert-err' : 'alert-ok'}>{message}</div>}

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-[var(--teal)] text-white font-display font-black text-2xl grid place-items-center shrink-0">
            {(user?.name || '?').charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-extrabold text-xl text-[var(--teal-dark)] m-0 truncate">
              {user?.name}
            </h2>
            <p className="text-sm text-[var(--muted)] m-0 mt-1" dir="ltr">
              {user?.email}
            </p>
            <p className="text-xs text-[var(--muted)] m-0 mt-1 inline-flex items-center gap-1.5">
              <Shield size={13} strokeWidth={2.3} />
              {roleLabels[user?.role || ''] || user?.role}
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={saveUser} className="surface-card p-5 sm:p-6 space-y-4">
        <h3 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 inline-flex items-center gap-2">
          <UserRound size={18} strokeWidth={2.2} />
          البيانات الأساسية
        </h3>
        <label className="block text-sm font-bold">
          الاسم
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field mt-1.5"
          />
        </label>
        <label className="block text-sm font-bold">
          البريد الإلكتروني
          <input
            value={user?.email || ''}
            disabled
            className="input-field mt-1.5 opacity-70"
            dir="ltr"
          />
        </label>
        <button type="submit" disabled={saving} className="btn-teal disabled:opacity-50">
          حفظ الاسم
        </button>
      </form>

      <form onSubmit={changePassword} className="surface-card p-5 sm:p-6 space-y-4">
        <h3 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 inline-flex items-center gap-2">
          <KeyRound size={18} strokeWidth={2.2} />
          تغيير كلمة المرور
        </h3>
        <label className="block text-sm font-bold">
          كلمة المرور الحالية
          <input
            type="password"
            required
            minLength={6}
            value={password.current}
            onChange={(e) => setPassword({ ...password, current: e.target.value })}
            className="input-field mt-1.5"
            dir="ltr"
          />
        </label>
        <label className="block text-sm font-bold">
          كلمة المرور الجديدة
          <input
            type="password"
            required
            minLength={6}
            value={password.next}
            onChange={(e) => setPassword({ ...password, next: e.target.value })}
            className="input-field mt-1.5"
            dir="ltr"
          />
        </label>
        <label className="block text-sm font-bold">
          تأكيد كلمة المرور
          <input
            type="password"
            required
            minLength={6}
            value={password.confirm}
            onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
            className="input-field mt-1.5"
            dir="ltr"
          />
        </label>
        <button type="submit" disabled={saving} className="btn-orange disabled:opacity-50">
          تحديث كلمة المرور
        </button>
      </form>
    </div>
  );
}
