'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    api
      .get<{ allowRegistration: boolean; maintenanceMode?: boolean }>('/auth/public-settings')
      .then((s) => {
        if (!s.allowRegistration || s.maintenanceMode) {
          setBlocked(true);
          setError(s.maintenanceMode ? 'المنصة قيد الصيانة' : 'التسجيل مغلق حالياً');
        }
      })
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked) return;
    setError('');
    setLoading(true);
    try {
      await register(form);
      localStorage.removeItem('onboarding_done');
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex items-center justify-center px-[clamp(1rem,4vw,1.5rem)] py-8 sm:py-12">
      <div className="w-full max-w-md surface-card p-5 sm:p-8 animate-rise">
        <div className="text-center mb-8">
          <div className="pill pill-teal mx-auto mb-4">◆ ابدأ مجاناً</div>
          <h1 className="font-display text-2xl font-black text-[var(--teal-dark)] mb-2">BusinessOS AI</h1>
          <p className="text-[var(--muted)] text-sm">أنشئ حساب شركتك وابدأ التشغيل خلال دقائق</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="bg-[var(--orange-soft)] text-[var(--orange-dark)] px-4 py-3 rounded-2xl text-sm font-medium">{error}</div>
          )}
          {[
            ['companyName', 'اسم الشركة', 'شركة النخبة', false],
            ['name', 'اسمك', 'أحمد محمد', false],
            ['email', 'البريد الإلكتروني', 'email@company.com', true],
            ['password', 'كلمة المرور', '••••••••', true],
            ['phone', 'رقم الجوال (اختياري)', '9665xxxxxxxx', true],
          ].map(([key, label, placeholder, ltr]) => (
            <div key={String(key)}>
              <label className="block text-sm font-bold mb-1.5">{label}</label>
              <input
                required={key !== 'phone'}
                type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
                minLength={key === 'password' ? 6 : undefined}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [String(key)]: e.target.value })}
                className="input-field"
                placeholder={String(placeholder)}
                dir={ltr ? 'ltr' : undefined}
              />
            </div>
          ))}
          <button type="submit" disabled={loading || blocked} className="btn-orange w-full justify-center mt-2 disabled:opacity-50">
            {loading ? 'جاري الإنشاء...' : '▶ إنشاء الحساب'}
          </button>
        </form>

        <p className="text-center text-[var(--muted)] mt-6 text-sm">
          لديك حساب؟{' '}
          <Link href="/login" className="text-[var(--teal)] font-bold hover:underline">
            سجّل دخولك
          </Link>
        </p>
      </div>
    </div>
  );
}
