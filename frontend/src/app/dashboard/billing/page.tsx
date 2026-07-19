'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  popular?: boolean;
}

interface SubInvoice {
  _id: string;
  number: string;
  planCode: string;
  amount: number;
  status: string;
  provider: string;
  checkoutUrl?: string;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sectors, setSectors] = useState<Array<{ id: string; name: string }>>([]);
  const [current, setCurrent] = useState<{ plan: Plan; sector?: string } | null>(null);
  const [invoices, setInvoices] = useState<SubInvoice[]>([]);
  const [provider, setProvider] = useState('demo');
  const [demoAllowed, setDemoAllowed] = useState(true);
  const [message, setMessage] = useState('');
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);

  const load = () => {
    api.get<Plan[]>('/billing/plans').then(setPlans).catch(console.error);
    api.get<Array<{ id: string; name: string }>>('/billing/sectors').then(setSectors).catch(console.error);
    api.get<{ plan: Plan; sector?: string }>('/billing/current').then(setCurrent).catch(console.error);
    api.get<SubInvoice[]>('/payments/invoices').then(setInvoices).catch(console.error);
    api
      .get<{ provider: string; demoAllowed?: boolean }>('/payments/provider')
      .then((p) => {
        setProvider(p.provider);
        setDemoAllowed(p.demoAllowed !== false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    load();
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('paid')) {
      setMessage('تم الدفع بنجاح — حدّث الصفحة إن لم تظهر الباقة بعد');
    }
  }, []);

  const upgrade = async (planId: string) => {
    setMessage('');
    try {
      const res = await api.post<{
        checkoutUrl?: string;
        invoice?: { _id: string };
        note?: string;
        success?: boolean;
      }>('/payments/checkout', { planId });

      if (res.checkoutUrl && provider !== 'demo') {
        window.location.href = res.checkoutUrl;
        return;
      }

      if (res.invoice?._id) {
        setPendingInvoiceId(res.invoice._id);
        setMessage(
          demoAllowed
            ? res.note || 'فاتورة جاهزة — أكّد الدفع التجريبي'
            : res.note || 'فاتورة معلّقة — أكمل الدفع عبر مزوّد الدفع الحقيقي',
        );
      } else {
        setMessage(res.note || 'تم التفعيل');
      }
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الدفع');
    }
  };

  const confirmDemo = async () => {
    if (!pendingInvoiceId) {
      const pending = invoices.find((i) => i.status === 'pending');
      if (!pending) return setMessage('لا فاتورة معلّقة');
      setPendingInvoiceId(pending._id);
      await api.post('/payments/confirm', { invoiceId: pending._id });
    } else {
      await api.post('/payments/confirm', { invoiceId: pendingInvoiceId });
    }
    setMessage('تم تأكيد الدفع التجريبي وتفعيل الباقة');
    setPendingInvoiceId(null);
    load();
  };

  const applySector = async (sector: string) => {
    await api.post('/billing/apply-sector', { sector });
    setMessage('تم تطبيق قالب القطاع');
    load();
  };

  const isError = message.includes('فشل') || message.includes('لا فاتورة');

  return (
    <div className="page-wrap max-w-5xl">
      <div className="pill pill-teal mb-3 text-xs !py-1.5 w-fit">
        الدفع: {provider === 'demo' && !demoAllowed ? 'معطّل (إنتاج)' : provider}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <h1 className="page-title m-0">الاشتراك والباقات</h1>
        <Link href="/dashboard/usage" className="btn-ghost text-sm">
          تفاصيل الاستخدام
        </Link>
      </div>
      <p className="page-sub mb-6">اختر باقة، ثم ابدأ التشغيل بنقاط أداء فورية</p>

      {message && <div className={isError ? 'alert-err' : 'alert-ok'}>{message}</div>}

      {provider === 'demo' && !demoAllowed && (
        <div className="alert-err mb-4">
          وضع Demo مخفي في الإنتاج. عيّن <span dir="ltr">PAYMENT_PROVIDER=stripe</span> أو{' '}
          <span dir="ltr">moyasar</span> مع مفاتيح الدفع، أو <span dir="ltr">ALLOW_DEMO_PAYMENTS=true</span>{' '}
          للتطوير فقط.
        </div>
      )}

      {provider !== 'demo' && (
        <div className="alert-ok mb-4">
          الدفع الحقيقي مفعّل عبر <strong>{provider}</strong> — ستُوجَّه لصفحة الدفع الآمنة عند الاشتراك.
        </div>
      )}

      {current && (
        <div className="surface-card p-4 mb-6 text-sm border border-[var(--teal)]">
          باقتك الحالية: <strong className="text-[var(--teal-dark)]">{current.plan?.name}</strong>
          {current.sector ? ` · القطاع: ${current.sector}` : ''}
        </div>
      )}

      {(pendingInvoiceId || invoices.some((i) => i.status === 'pending')) &&
        provider === 'demo' &&
        demoAllowed && (
          <button type="button" onClick={confirmDemo} className="btn-orange mb-6 text-sm">
            ▶ تأكيد الدفع التجريبي
          </button>
        )}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        {plans.map((p) => (
          <div key={p.id} className={`mode-card ${p.popular || current?.plan?.id === p.id ? 'active' : ''}`}>
            {p.popular && <div className="text-xs text-[var(--teal)] font-bold mb-2">الأكثر طلباً</div>}
            <h3 className="font-display font-extrabold text-lg">{p.name}</h3>
            <p className="font-display text-3xl font-black text-[var(--teal-dark)] my-3">
              ${p.price}<span className="text-sm text-[var(--muted)] font-bold">/شهر</span>
            </p>
            <ul className="text-sm text-[var(--muted)] space-y-1 mb-4">
              {p.features.map((f) => <li key={f}>✔ {f}</li>)}
            </ul>
            <button
              onClick={() => upgrade(p.id)}
              className={`w-full justify-center ${p.popular ? 'btn-orange' : 'btn-ghost'} !rounded-2xl`}
            >
              {current?.plan?.id === p.id ? 'الباقة الحالية' : 'اشترك / ترقية'}
            </button>
          </div>
        ))}
      </div>

      <h2 className="font-bold text-xl mb-3">فواتير الاشتراك</h2>
      <div className="table-wrap mb-10">
        {invoices.length ? (
          <table>
            <thead>
              <tr>
                <th>الرقم</th>
                <th>الباقة</th>
                <th>المبلغ</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td dir="ltr">{inv.number}</td>
                  <td>{inv.planCode}</td>
                  <td>${inv.amount}</td>
                  <td>
                    <span className={`badge ${inv.status === 'paid' ? 'badge-ok' : inv.status === 'pending' ? 'badge-warn' : 'badge-off'}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state text-sm">لا فواتير بعد</p>
        )}
      </div>

      <h2 className="font-bold text-xl mb-3">قالب القطاع</h2>
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 gap-3">
        {sectors.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => applySector(s.id)}
            className="mode-card text-right hover:border-[var(--teal)] !p-4"
          >
            <p className="font-semibold break-words">{s.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
