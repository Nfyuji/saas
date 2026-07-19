'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [sectors, setSectors] = useState<Array<{ id: string; name: string }>>([]);
  const [sector, setSector] = useState('ecommerce');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    api.get<Array<{ id: string; name: string }>>('/billing/sectors').then(setSectors).catch(console.error);
  }, []);

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/billing/apply-sector', { sector });
      await api.post('/billing/upgrade', { planId: 'growth' });
      await api.post('/whatsapp/demo/enable');
      await api.post('/whatsapp/demo/simulate', {
        text: 'السلام عليكم، كم سعر السماعات؟',
        name: 'عميل تجريبي',
        from: '966512345678',
      });
      localStorage.setItem('onboarding_done', '1');
      router.push('/dashboard/inbox');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الإعداد');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return <div className="app-shell flex items-center justify-center text-[var(--muted)]">جاري التحميل...</div>;
  }

  return (
    <div className="app-shell flex items-center justify-center px-[clamp(1rem,4vw,1.5rem)] py-8">
      <div className="w-full max-w-xl surface-card p-5 sm:p-8 animate-rise">
        <div className="text-center mb-8">
          <div className="pill pill-teal mx-auto mb-4">◆ إعداد سريع</div>
          <h1 className="font-display text-2xl font-black text-[var(--teal-dark)] mb-2">BusinessOS AI</h1>
          <p className="text-[var(--muted)] text-sm">٣ خطوات وتكون جاهز للإطلاق</p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`h-2 w-16 rounded-full ${step >= n ? 'bg-[var(--teal)]' : 'bg-[var(--border)]'}`} />
            ))}
          </div>
        </div>

        {error && <div className="mb-4 bg-[var(--orange-soft)] text-[var(--orange-dark)] px-4 py-3 rounded-2xl text-sm font-medium">{error}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display font-extrabold text-xl text-[var(--teal-dark)]">ما قطاع شركتك؟</h2>
            <p className="text-sm text-[var(--muted)]">نضبط تعليمات AI والأتمتة وقاعدة معرفة أولية حسب قطاعك</p>
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
              {sectors.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSector(s.id)}
                  className={`mode-card !p-4 text-right ${sector === s.id ? 'active' : ''}`}
                >
                  <span className="font-bold break-words">{s.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="btn-orange w-full justify-center">
              التالي ▶
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display font-extrabold text-xl text-[var(--teal-dark)]">باقة النمو (تجربة الإطلاق)</h2>
            <ul className="text-sm text-[var(--muted)] space-y-2 surface-card !shadow-none p-4 border border-[var(--border)]">
              <li>✔ مندوب AI + متابعة تلقائية</li>
              <li>✔ عروض أسعار وفواتير</li>
              <li>✔ قاعدة معرفة + فرص ضائعة</li>
              <li>✔ وضع واتساب تجريبي جاهز</li>
            </ul>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1 justify-center">رجوع</button>
              <button onClick={() => setStep(3)} className="btn-orange flex-1 justify-center">التالي ▶</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display font-extrabold text-xl text-[var(--teal-dark)]">تفعيل واتساب التجريبي</h2>
            <p className="text-sm text-[var(--muted)]">
              سنفعّل وضع Demo ونرسل رسالة عميل وهمية لترى الرد الذكي فوراً — بدون Meta الآن.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-ghost flex-1 justify-center">رجوع</button>
              <button disabled={busy} onClick={finish} className="btn-orange flex-1 justify-center disabled:opacity-50">
                {busy ? 'جاري التجهيز...' : '▶ إطلاق المنصة'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
