'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Opportunities {
  summary: {
    waitingNoReply: number;
    coldDeals: number;
    overdueFollowUps: number;
    lostThisWeek: number;
    lostValue: number;
    openPipeline: number;
    pipelineValue: number;
    estimatedOpportunityLoss: number;
  };
  waitingNoReply: Array<{
    _id: string;
    title: string;
    value: number;
    currency: string;
    customerId?: { name: string; phone?: string };
  }>;
  coldDeals: Array<{
    _id: string;
    title: string;
    value: number;
    currency: string;
    customerId?: { name: string; phone?: string };
  }>;
}

export default function OpportunitiesPage() {
  const [data, setData] = useState<Opportunities | null>(null);

  useEffect(() => {
    api.get<Opportunities>('/followups/opportunities').then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="page-wrap empty-state">جاري تحليل الفرص...</div>;

  const s = data.summary;

  return (
    <div className="page-wrap">
      <h1 className="page-title mb-2">لوحة الفرص الضائعة</h1>
      <p className="page-sub mb-6">هذا ما قد تخسره لو لم تتابع عملاء واتساب</p>

      <div className="rounded-[var(--radius-xl)] p-6 mb-6 text-white" style={{ background: 'linear-gradient(to left, var(--orange), var(--teal-dark))' }}>
        <p className="text-sm opacity-90">تقدير قيمة الفرص غير المتابعة</p>
        <p className="text-4xl font-bold mt-1">
          {s.estimatedOpportunityLoss.toLocaleString('ar')} ر.س
        </p>
        <p className="text-sm mt-2 opacity-90">
          {s.waitingNoReply} بانتظار رد · {s.coldDeals} صفقات باردة · {s.overdueFollowUps} متابعات مستحقة
        </p>
      </div>

      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { label: 'بلا رد (24س)', value: s.waitingNoReply },
          { label: 'صفقات باردة', value: s.coldDeals },
          { label: 'خسارة الأسبوع', value: s.lostValue },
          { label: 'قيمة الأنبوب', value: s.pipelineValue },
        ].map((c) => (
          <div key={c.label} className="surface-card p-4">
            <p className="text-2xl font-bold">{Number(c.value).toLocaleString('ar')}</p>
            <p className="text-xs text-[var(--muted)]">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="surface-card p-5">
          <h2 className="font-bold mb-4">عملاء ينتظرون رداً</h2>
          {data.waitingNoReply.length ? data.waitingNoReply.map((d) => (
            <div key={d._id} className="flex justify-between py-3 border-b border-[var(--border)] text-sm">
              <div>
                <p className="font-medium">{d.customerId?.name || d.title}</p>
                <p className="text-xs text-[var(--muted)]">{d.title}</p>
              </div>
              <span className="badge badge-warn">{d.value} {d.currency || 'SAR'}</span>
            </div>
          )) : <p className="text-[var(--muted)] text-sm">ممتاز — لا يوجد انتظار حالياً</p>}
        </section>

        <section className="surface-card p-5">
          <h2 className="font-bold mb-4">صفقات بردت</h2>
          {data.coldDeals.length ? data.coldDeals.map((d) => (
            <div key={d._id} className="flex justify-between py-3 border-b border-[var(--border)] text-sm">
              <div>
                <p className="font-medium">{d.customerId?.name || d.title}</p>
                <p className="text-xs text-[var(--muted)]">{d.title}</p>
              </div>
              <Link href="/dashboard/deals" className="chip chip-teal text-xs self-center">متابعة</Link>
            </div>
          )) : <p className="text-[var(--muted)] text-sm">لا صفقات باردة</p>}
        </section>
      </div>
    </div>
  );
}
