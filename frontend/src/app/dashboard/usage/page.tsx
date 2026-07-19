'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  RefreshCw,
  CreditCard,
  MessageCircle,
  Users,
  BookOpen,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';

interface Meter {
  key: string;
  label: string;
  used: number;
  limit: number | null;
  unlimited: boolean;
  percent: number | null;
  remaining: number | null;
  status: 'ok' | 'warn' | 'danger' | 'unlimited';
  unit: string;
  href?: string;
  note?: string;
}

interface UsageDash {
  plan: {
    code: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    features: string[];
  };
  meters: Meter[];
  stats: {
    customers: number;
    openConversations: number;
    messagesTotal: number;
    inboundToday: number;
    outboundToday: number;
  };
  features: Record<string, boolean>;
  expiresAt?: string;
  daysLeft: number | null;
  isActive: boolean;
  suspendedReason?: string | null;
  whatsapp: {
    configured: boolean;
    demo?: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
  };
  alerts: Array<{ type: 'warn' | 'danger' | 'info'; code: string; text: string; href?: string }>;
  generatedAt?: string;
}

const featureLabels: Record<string, string> = {
  salesAgentEnabled: 'مندوب مبيعات AI',
  autoFollowUp: 'متابعات تلقائية',
  invoicesEnabled: 'الفواتير',
  knowledgeEnabled: 'قاعدة المعرفة',
  opportunitiesEnabled: 'الفرص الضائعة',
};

function statusClass(status: Meter['status']) {
  if (status === 'danger') return 'is-danger';
  if (status === 'warn') return 'is-warn';
  return '';
}

export default function UsagePage() {
  const [data, setData] = useState<UsageDash | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get<UsageDash>('/billing/usage')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'فشل التحميل'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading && !data) {
    return <div className="page-wrap empty-state">جاري تحميل بيانات الاستخدام...</div>;
  }

  if (error && !data) {
    return (
      <div className="page-wrap">
        <div className="alert-err">{error}</div>
        <button type="button" className="btn-teal mt-4" onClick={load}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="استخدام الباقة"
        subtitle={`${data.plan.name} · تفاصيل دقيقة لحدود الاشتراك والاستهلاك الحالي`}
        eyebrow="Usage"
        actions={
          <>
            <button type="button" onClick={load} className="btn-ghost text-sm" disabled={loading}>
              <RefreshCw size={15} strokeWidth={2.3} className={loading ? 'animate-spin' : ''} />
              تحديث
            </button>
            <Link href="/dashboard/billing" className="btn-orange text-sm">
              <CreditCard size={15} strokeWidth={2.3} />
              ترقية الباقة
            </Link>
          </>
        }
      />

      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a) => (
            <div
              key={a.code}
              className={
                a.type === 'danger' ? 'alert-err' : a.type === 'warn' ? 'alert-err' : 'alert-ok'
              }
            >
              <span className="inline-flex items-center gap-2">
                {(a.type === 'danger' || a.type === 'warn') && <AlertTriangle size={15} />}
                {a.href ? (
                  <Link href={a.href} className="font-bold underline-offset-2 hover:underline">
                    {a.text}
                  </Link>
                ) : (
                  a.text
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <section className="surface-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="pill pill-teal text-xs !py-1.5 w-fit mb-2">{data.plan.code}</div>
            <h2 className="font-display font-extrabold text-xl text-[var(--teal-dark)] m-0">
              {data.plan.name}
            </h2>
            {data.plan.description && (
              <p className="text-sm text-[var(--muted)] mt-1 mb-0">{data.plan.description}</p>
            )}
            <p className="text-sm font-bold mt-3 mb-0">
              {data.plan.price > 0
                ? `${data.plan.price} ${data.plan.currency || 'USD'} / شهر`
                : 'تجريبية / مجانية'}
              {' · '}
              الحالة:{' '}
              <span className={data.isActive ? 'text-[var(--teal)]' : 'text-[var(--orange-dark)]'}>
                {data.isActive ? 'نشط' : data.suspendedReason || 'موقوف'}
              </span>
            </p>
            <p className="text-sm text-[var(--muted)] mt-1 mb-0">
              {data.expiresAt
                ? `ينتهي: ${new Date(data.expiresAt).toLocaleDateString('ar')}${
                    data.daysLeft != null ? ` · متبقي ${data.daysLeft} يوم` : ''
                  }`
                : 'بدون تاريخ انتهاء محدد'}
            </p>
          </div>
          <div className="text-sm space-y-1">
            <p className="m-0 font-bold flex items-center gap-2">
              <Smartphone size={15} className="text-[var(--teal)]" />
              واتساب:{' '}
              {!data.whatsapp.configured
                ? 'غير مربوط'
                : data.whatsapp.demo
                  ? 'تجريبي'
                  : 'متصل'}
            </p>
            {data.whatsapp.displayPhoneNumber && (
              <p className="m-0 text-[var(--muted)]" dir="ltr">
                {data.whatsapp.displayPhoneNumber}
              </p>
            )}
            {data.whatsapp.verifiedName && (
              <p className="m-0 text-[var(--muted)]">{data.whatsapp.verifiedName}</p>
            )}
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <div className="mode-card !p-4">
          <Users size={18} className="text-[var(--teal)]" />
          <p className="font-display text-2xl font-black text-[var(--teal-dark)] mt-2">
            {data.stats.customers.toLocaleString('ar')}
          </p>
          <p className="text-sm text-[var(--muted)] font-bold m-0">العملاء</p>
        </div>
        <div className="mode-card !p-4">
          <MessageCircle size={18} className="text-[var(--orange)]" />
          <p className="font-display text-2xl font-black text-[var(--teal-dark)] mt-2">
            {data.stats.openConversations.toLocaleString('ar')}
          </p>
          <p className="text-sm text-[var(--muted)] font-bold m-0">محادثات مفتوحة</p>
        </div>
        <div className="mode-card !p-4">
          <Activity size={18} className="text-[var(--teal)]" />
          <p className="font-display text-2xl font-black text-[var(--teal-dark)] mt-2">
            {data.stats.messagesTotal.toLocaleString('ar')}
          </p>
          <p className="text-sm text-[var(--muted)] font-bold m-0">إجمالي الرسائل</p>
        </div>
        <div className="mode-card !p-4">
          <BookOpen size={18} className="text-[var(--sky)]" />
          <p className="font-display text-2xl font-black text-[var(--teal-dark)] mt-2">
            {(data.stats.inboundToday + data.stats.outboundToday).toLocaleString('ar')}
          </p>
          <p className="text-sm text-[var(--muted)] font-bold m-0">
            اليوم · وارد {data.stats.inboundToday} / صادر {data.stats.outboundToday}
          </p>
        </div>
      </div>

      <section>
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] mb-3">
          عدّادات الحدود
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {data.meters.map((m) => (
            <Link
              key={m.key}
              href={m.href || '/dashboard/billing'}
              className="surface-card p-5 block no-underline hover:border-[var(--teal)] transition"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold m-0 text-[var(--teal-dark)]">{m.label}</p>
                  {m.note && <p className="text-xs text-[var(--muted)] mt-1 mb-0">{m.note}</p>}
                </div>
                <span
                  className={`badge ${
                    m.status === 'danger'
                      ? 'badge-warn'
                      : m.status === 'warn'
                        ? 'badge-warn'
                        : 'badge-ok'
                  }`}
                >
                  {m.unlimited ? 'غير محدود' : m.status === 'danger' ? 'ممتلئ' : m.status === 'warn' ? 'قريب' : 'جيد'}
                </span>
              </div>
              <p className="font-display text-2xl font-black text-[var(--teal-dark)] m-0" dir="ltr">
                {m.used.toLocaleString('ar')}
                {!m.unlimited && (
                  <span className="text-base text-[var(--muted)]"> / {m.limit?.toLocaleString('ar')}</span>
                )}
                <span className="text-sm text-[var(--muted)] font-bold ms-1">{m.unit}</span>
              </p>
              {!m.unlimited && (
                <>
                  <span className="usage-chip-bar mt-3" aria-hidden>
                    <span
                      className={`usage-chip-fill ${statusClass(m.status)}`}
                      style={{ width: `${m.percent ?? 0}%` }}
                    />
                  </span>
                  <p className="text-xs text-[var(--muted)] mt-2 mb-0">
                    متبقي {(m.remaining ?? 0).toLocaleString('ar')} · {m.percent}%
                  </p>
                </>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 mb-4">
          ميزات الباقة
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {Object.entries(featureLabels).map(([key, label]) => {
            const on = !!data.features[key];
            return (
              <div
                key={key}
                className={`rounded-2xl px-3 py-2.5 text-sm font-bold ${
                  on ? 'bg-[var(--teal-soft)] text-[var(--teal-dark)]' : 'bg-[var(--border)]/50 text-[var(--muted)]'
                }`}
              >
                {on ? '✔' : '—'} {label}
              </div>
            );
          })}
        </div>
        {data.plan.features?.length > 0 && (
          <ul className="text-sm text-[var(--muted)] space-y-1 m-0 ps-4">
            {data.plan.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
      </section>

      {data.generatedAt && (
        <p className="text-xs text-[var(--muted)] m-0">
          آخر تحديث: {new Date(data.generatedAt).toLocaleString('ar')}
        </p>
      )}
    </div>
  );
}
