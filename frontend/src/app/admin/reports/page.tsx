'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Reports {
  growth: {
    newLast30Days: number;
    newPrev30Days: number;
    growthRate: number;
    series: Array<{ _id: string; count: number }>;
  };
  conversion: { paidSubscriptionsLast30Days: number };
  usage: { messagesLast30Days: number; activeCompanies: number; totalCompanies: number };
  churn: { suspendedLast30Days: number; churnRate: number };
}

export default function AdminReportsPage() {
  const [data, setData] = useState<Reports | null>(null);

  useEffect(() => {
    api.get<Reports>('/platform-admin/reports').then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="page-wrap animate-pulse text-[var(--muted)]">جاري تحميل التقارير...</div>;

  const cards = [
    { label: 'مشتركون جدد (30 يوم)', value: data.growth.newLast30Days },
    { label: 'نمو شهري', value: `${Math.round(data.growth.growthRate * 100)}%` },
    { label: 'اشتراكات مدفوعة', value: data.conversion.paidSubscriptionsLast30Days },
    { label: 'رسائل (30 يوم)', value: data.usage.messagesLast30Days },
    { label: 'إيقاف / Churn', value: `${data.churn.suspendedLast30Days} (${Math.round(data.churn.churnRate * 100)}%)` },
    { label: 'شركات نشطة', value: `${data.usage.activeCompanies}/${data.usage.totalCompanies}` },
  ];

  return (
    <div className="page-wrap">
      <div className="mb-8">
        <h1 className="page-title">تقارير المنصة</h1>
        <p className="page-sub">نمو · تحويل · استخدام · Churn</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="surface-card p-6">
            <p className="font-display text-3xl font-black text-[var(--teal-dark)]">{c.value}</p>
            <p className="text-sm text-[var(--muted)] mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="surface-card p-6">
        <h2 className="font-display font-extrabold text-lg mb-4 text-[var(--teal-dark)]">تسجيل مشتركين يومي (30 يوم)</h2>
        <div className="space-y-2">
          {data.growth.series.length ? (
            data.growth.series.map((d) => (
              <div key={d._id} className="flex items-center gap-3 text-sm">
                <span className="w-28 text-[var(--muted)]" dir="ltr">{d._id}</span>
                <div className="flex-1 h-2 bg-[var(--teal-soft)]/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--teal)] rounded-full"
                    style={{
                      width: `${Math.max(8, (d.count / Math.max(...data.growth.series.map((x) => x.count), 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-8 font-semibold">{d.count}</span>
              </div>
            ))
          ) : (
            <p className="empty-state !py-4">لا بيانات بعد</p>
          )}
        </div>
      </div>
    </div>
  );
}
