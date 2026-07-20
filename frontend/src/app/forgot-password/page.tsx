'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setResetUrl('');
    try {
      const res = await api.post<{ message: string; resetUrl?: string }>('/auth/forgot-password', {
        email,
      });
      setMessage(res.message || 'تم إرسال التعليمات إن وُجد الحساب');
      if (res.resetUrl) setResetUrl(res.resetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الطلب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex items-center justify-center px-[clamp(1rem,4vw,1.5rem)] py-8">
      <div className="w-full max-w-md surface-card p-5 sm:p-8 animate-rise">
        <h1 className="font-display text-2xl font-black text-[var(--teal-dark)] mb-2">نسيت كلمة المرور؟</h1>
        <p className="text-sm text-[var(--muted)] mb-6">أدخل بريدك وسنجهّز رابط إعادة التعيين</p>

        <form onSubmit={submit} className="space-y-4">
          {error && <div className="alert-err">{error}</div>}
          {message && <div className="alert-ok">{message}</div>}
          {resetUrl && (
            <div className="surface-card !shadow-none border border-[var(--border)] p-3 text-sm break-all">
              <p className="text-xs text-[var(--muted)] m-0 mb-1">رابط التطوير:</p>
              <Link href={resetUrl} className="text-[var(--teal)] font-bold hover:underline">
                {resetUrl}
              </Link>
            </div>
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="email@company.com"
            dir="ltr"
          />
          <button type="submit" disabled={loading} className="btn-orange w-full justify-center disabled:opacity-60">
            {loading ? '...' : 'إرسال رابط الاستعادة'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          <Link href="/login" className="text-[var(--teal)] font-bold hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
