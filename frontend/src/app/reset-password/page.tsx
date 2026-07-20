'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function ResetForm() {
  const search = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState(search.get('token') || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOk('');
    try {
      const res = await api.post<{ message: string }>('/auth/reset-password', {
        token,
        newPassword: password,
      });
      setOk(res.message || 'تم التعيين');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التعيين');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="alert-err">{error}</div>}
      {ok && <div className="alert-ok">{ok}</div>}
      <div>
        <label className="block text-sm font-bold mb-1.5">رمز الاستعادة</label>
        <input
          required
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="input-field"
          dir="ltr"
        />
      </div>
      <div>
        <label className="block text-sm font-bold mb-1.5">كلمة المرور الجديدة</label>
        <input
          required
          minLength={6}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          dir="ltr"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-orange w-full justify-center disabled:opacity-60">
        {loading ? '...' : 'تعيين كلمة المرور'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="app-shell flex items-center justify-center px-[clamp(1rem,4vw,1.5rem)] py-8">
      <div className="w-full max-w-md surface-card p-5 sm:p-8 animate-rise">
        <h1 className="font-display text-2xl font-black text-[var(--teal-dark)] mb-2">تعيين كلمة مرور جديدة</h1>
        <p className="text-sm text-[var(--muted)] mb-6">أدخل الرمز وكلمة المرور الجديدة</p>
        <Suspense fallback={<p className="empty-state">...</p>}>
          <ResetForm />
        </Suspense>
        <p className="text-center text-sm text-[var(--muted)] mt-6">
          <Link href="/login" className="text-[var(--teal)] font-bold hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
