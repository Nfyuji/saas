'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [platformName, setPlatformName] = useState('BusinessOS AI');

  useEffect(() => {
    api
      .get<{ allowRegistration: boolean; platformName: string; maintenanceMode?: boolean }>('/auth/public-settings')
      .then((s) => {
        setAllowRegistration(s.allowRegistration !== false);
        if (s.platformName) setPlatformName(s.platformName);
        if (s.maintenanceMode) setError('المنصة قيد الصيانة حالياً');
      })
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      router.push(result.isPlatformAdmin ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex items-center justify-center px-[clamp(1rem,4vw,1.5rem)] py-8 sm:py-10">
      <div className="w-full max-w-md surface-card p-5 sm:p-8 animate-rise">
        <div className="text-center mb-8">
          <div className="pill pill-teal mx-auto mb-4">◆ AI</div>
          <h1 className="font-display text-2xl font-black text-[var(--teal-dark)] mb-2">{platformName}</h1>
          <p className="text-[var(--muted)] text-sm">سجّل دخولك إلى لوحة التشغيل</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-[var(--orange-soft)] text-[var(--orange-dark)] px-4 py-3 rounded-2xl text-sm font-medium">{error}</div>
          )}
          <div>
            <label className="block text-sm font-bold mb-1.5">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="email@company.com"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">كلمة المرور</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-orange w-full justify-center disabled:opacity-60">
            {loading ? 'جاري الدخول...' : '▶ دخول'}
          </button>
        </form>

        <p className="text-center text-[var(--muted)] mt-4 text-sm">
          <Link href="/forgot-password" className="text-[var(--teal)] font-bold hover:underline">
            نسيت كلمة المرور؟
          </Link>
        </p>

        {allowRegistration ? (
          <p className="text-center text-[var(--muted)] mt-6 text-sm">
            ليس لديك حساب؟{' '}
            <Link href="/register" className="text-[var(--teal)] font-bold hover:underline">
              سجّل الآن
            </Link>
          </p>
        ) : (
          <p className="text-center text-[var(--muted)] mt-6 text-sm">التسجيل مغلق حالياً</p>
        )}
      </div>
    </div>
  );
}
