'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Overview {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  expiredCompanies?: number;
  totalUsers: number;
  totalCustomers: number;
  totalMessages: number;
  paidRevenue: number;
  estimatedMrr?: number;
  plans: Record<string, number>;
  plansCount?: number;
  activePlansCount?: number;
  recentCompanies: Array<{
    _id: string;
    name: string;
    email?: string;
    plan: string;
    isActive: boolean;
    createdAt?: string;
  }>;
  recentAudits?: Array<{
    _id: string;
    action: string;
    targetName?: string;
    createdAt?: string;
  }>;
}

export default function AdminHomePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Overview>('/platform-admin/overview')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse text-[var(--muted)]">جاري تحميل الإحصائيات...</div>;
  }

  const cards = [
    { label: 'المشتركون', value: data?.totalCompanies ?? 0, icon: '🏢', tone: 'teal' },
    { label: 'نشطون', value: data?.activeCompanies ?? 0, icon: '✅', tone: 'teal' },
    { label: 'موقوفون', value: data?.suspendedCompanies ?? 0, icon: '⛔', tone: 'orange' },
    { label: 'منتهية', value: data?.expiredCompanies ?? 0, icon: '⏰', tone: 'orange' },
    { label: 'MRR تقديري', value: data?.estimatedMrr ?? 0, icon: '💵', tone: 'sky', money: true },
    { label: 'فواتير مدفوعة', value: data?.paidRevenue ?? 0, icon: '🧾', tone: 'sky', money: true },
  ];

  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="pill pill-teal mb-3 text-xs !py-1.5">Control Center</div>
          <h1 className="font-display text-3xl font-black text-[var(--teal-dark)]">لوحة التحكم</h1>
          <p className="text-[var(--muted)] mt-1">نظرة شاملة على المنصة والاشتراكات والإيرادات</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/subscribers" className="btn-teal text-sm !py-2.5">
            إدارة المشتركين
          </Link>
          <Link href="/admin/plans" className="btn-orange text-sm !py-2.5 !px-4">
            الباقات
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="mode-card !p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={`icon-badge ${card.tone}`}>{card.icon}</span>
            </div>
            <p className="font-display text-2xl font-black text-[var(--teal-dark)]">
              {card.money ? `$${Number(card.value).toLocaleString()}` : card.value.toLocaleString('ar')}
            </p>
            <p className="text-[var(--muted)] text-sm mt-1 font-bold">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="surface-card p-6">
          <h2 className="font-display font-extrabold text-lg mb-4 text-[var(--teal-dark)]">توزيع الباقات</h2>
          {data && Object.keys(data.plans).length ? (
            <div className="space-y-3">
              {Object.entries(data.plans).map(([plan, count]) => {
                const max = Math.max(...Object.values(data.plans), 1);
                return (
                  <div key={plan} className="flex items-center gap-3">
                    <span className="text-sm w-20 capitalize font-medium">{plan}</span>
                    <div className="flex-1 h-3 bg-[var(--teal-soft)]/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--teal)] rounded-full"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[var(--muted)] text-sm text-center py-8">لا توجد بيانات بعد</p>
          )}
          <p className="text-xs text-[var(--muted)] mt-4">
            باقات مفعّلة: {data?.activePlansCount ?? 0} / {data?.plansCount ?? 0}
          </p>
        </div>

        <div className="surface-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)]">أحدث المشتركين</h2>
            <Link href="/admin/subscribers" className="text-sm font-bold text-[var(--teal)]">عرض الكل</Link>
          </div>
          {data?.recentCompanies?.length ? (
            <div className="space-y-3">
              {data.recentCompanies.map((c) => (
                <Link
                  key={c._id}
                  href={`/admin/subscribers/${c._id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[var(--teal-soft)]/40 transition"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] font-bold">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    <p className="text-xs text-[var(--muted)] truncate">{c.email || '—'}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium capitalize">{c.plan}</p>
                    <p className={`text-xs ${c.isActive ? 'text-[var(--teal)]' : 'text-[var(--orange)]'}`}>
                      {c.isActive ? 'نشط' : 'موقوف'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[var(--muted)] text-sm text-center py-8">لا مشتركين بعد</p>
          )}
        </div>

        <div className="surface-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)]">آخر عمليات الأدمن</h2>
            <Link href="/admin/activity" className="text-sm font-bold text-[var(--teal)]">السجل</Link>
          </div>
          {data?.recentAudits?.length ? (
            <div className="space-y-3">
              {data.recentAudits.map((a) => (
                <div key={a._id} className="p-3 rounded-2xl bg-[var(--teal-soft)]/40 text-sm">
                  <p className="font-bold">{a.action}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">{a.targetName || '—'}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {a.createdAt ? new Date(a.createdAt).toLocaleString('ar') : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--muted)] text-sm text-center py-8">لا عمليات بعد</p>
          )}
        </div>
      </div>
    </div>
  );
}
