'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';

interface Forecast {
  metrics: {
    revenueLast30: number;
    revenuePrev30: number;
    growthPercent: number;
    pipelineValue: number;
    openPipelineDeals: number;
    customers: number;
    messagesLast30: number;
    predictedNext30: number;
  };
  hotDeals: Array<{ _id: string; title?: string; value?: number; stage?: string }>;
  narrative: string;
}

export default function ForecastPage() {
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Forecast>('/intelligence/forecast')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-wrap empty-state">جاري حساب التوقّعات...</div>;
  if (!data) return <div className="page-wrap alert-err">فشل التحميل</div>;

  const m = data.metrics;

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="تنبؤ المبيعات"
        subtitle="AI يقرأ الإيراد وخط الأنابيب ويتوقع الـ 30 يوماً القادمة"
        eyebrow="Sales Forecast"
        actions={
          <Link href="/dashboard/deals" className="btn-ghost text-sm">
            الصفقات
          </Link>
        }
      />

      <div className="stat-grid">
        <div className="mode-card !p-4">
          <p className="text-xs text-[var(--muted)] font-bold m-0">إيراد 30 يوم</p>
          <p className="font-display text-2xl font-black text-[var(--teal-dark)] mt-1 mb-0">
            {m.revenueLast30.toLocaleString('ar')}
          </p>
        </div>
        <div className="mode-card !p-4">
          <p className="text-xs text-[var(--muted)] font-bold m-0">النمو</p>
          <p className="font-display text-2xl font-black text-[var(--orange)] mt-1 mb-0">
            {m.growthPercent}%
          </p>
        </div>
        <div className="mode-card !p-4">
          <p className="text-xs text-[var(--muted)] font-bold m-0">خط الأنابيب</p>
          <p className="font-display text-2xl font-black text-[var(--teal-dark)] mt-1 mb-0">
            {m.pipelineValue.toLocaleString('ar')}
          </p>
        </div>
        <div className="mode-card !p-4 border border-[var(--teal)]">
          <p className="text-xs text-[var(--muted)] font-bold m-0 flex items-center gap-1">
            <TrendingUp size={14} /> توقّع 30 يوماً
          </p>
          <p className="font-display text-2xl font-black text-[var(--teal-dark)] mt-1 mb-0">
            {m.predictedNext30.toLocaleString('ar')}
          </p>
        </div>
      </div>

      <section className="surface-card p-5 sm:p-6">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 mb-3">
          تحليل AI
        </h2>
        <p className="text-sm whitespace-pre-wrap m-0 leading-7">{data.narrative}</p>
      </section>

      {data.hotDeals?.length > 0 && (
        <section className="surface-card p-5">
          <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 mb-3">
            صفقات ساخنة
          </h2>
          <div className="space-y-2">
            {data.hotDeals.map((d) => (
              <div key={d._id} className="flex justify-between gap-3 text-sm p-2 rounded-xl hover:bg-[var(--teal-soft)]/40">
                <span className="font-bold">{d.title || 'صفقة'}</span>
                <span>
                  {Number(d.value || 0).toLocaleString('ar')} · {d.stage}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
