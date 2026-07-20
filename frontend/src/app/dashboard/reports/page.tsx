'use client';

import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';

interface Reports {
  kpis: {
    newCustomers30: number;
    messages30: number;
    wonDeals30: number;
    wonValue30: number;
    lostDeals30: number;
    winRate: number;
    aiReplyPercent: number;
    paidInvoices30: number;
    paidRevenue30: number;
    pendingInvoices: number;
    pendingValue: number;
  };
  dealsByStage: Array<{ stage: string; count: number; value: number }>;
  messagesByDay: Array<{ date: string; inbound: number; outbound: number }>;
  topCustomers: Array<{ name: string; phone?: string; value: number; deals: number }>;
}

const stageAr: Record<string, string> = {
  lead: 'عميل محتمل',
  qualified: 'مؤهل',
  proposal: 'عرض',
  negotiation: 'تفاوض',
  won: 'مكسوبة',
  lost: 'خاسرة',
  cold: 'باردة',
};

export default function ReportsPage() {
  const [data, setData] = useState<Reports | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Reports>('/dashboard/reports')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-wrap empty-state">جاري تحميل التقارير...</div>;
  if (!data) return <div className="page-wrap empty-state">تعذر تحميل التقارير</div>;

  const k = data.kpis;
  const maxMsg = Math.max(1, ...data.messagesByDay.map((d) => d.inbound + d.outbound));

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="تقارير المبيعات"
        subtitle="أداء آخر 30 يوماً: تحويل، إيراد، ومشاركة الـ AI"
        eyebrow="Analytics"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          ['عملاء جدد', k.newCustomers30],
          ['رسائل', k.messages30],
          ['صفقات مكسوبة', k.wonDeals30],
          ['نسبة الفوز', `${k.winRate}%`],
          ['قيمة مكسوبة', `${k.wonValue30.toLocaleString('ar')} ر.س`],
          ['إيراد مدفوع', `${k.paidRevenue30.toLocaleString('ar')} ر.س`],
          ['ردود AI', `${k.aiReplyPercent}%`],
          ['فواتير معلّقة', k.pendingInvoices],
        ].map(([label, value]) => (
          <div key={String(label)} className="surface-card p-4">
            <p className="text-xs text-[var(--muted)] m-0 mb-1">{label}</p>
            <p className="font-display font-black text-xl text-[var(--teal-dark)] m-0">{value}</p>
          </div>
        ))}
      </div>

      <section className="surface-card p-5">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-[var(--orange)]" />
          الرسائل (14 يوم)
        </h2>
        <div className="flex items-end gap-1.5 h-36 overflow-x-auto">
          {data.messagesByDay.map((d) => {
            const total = d.inbound + d.outbound;
            const h = Math.max(4, Math.round((total / maxMsg) * 100));
            return (
              <div key={d.date} className="flex flex-col items-center gap-1 min-w-[28px] flex-1">
                <div
                  className="w-full rounded-t-md bg-[var(--teal)]/80"
                  style={{ height: `${h}%` }}
                  title={`${d.date}: وارد ${d.inbound} / صادر ${d.outbound}`}
                />
                <span className="text-[9px] text-[var(--muted)]">{d.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="surface-card p-5">
          <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 mb-3">خط الأنابيب</h2>
          <ul className="space-y-2 m-0 p-0 list-none">
            {data.dealsByStage.map((s) => (
              <li key={s.stage} className="flex justify-between gap-3 text-sm border-b border-[var(--border)] pb-2">
                <span>{stageAr[s.stage] || s.stage}</span>
                <span className="font-bold text-[var(--teal-dark)]">
                  {s.count} · {s.value.toLocaleString('ar')} ر.س
                </span>
              </li>
            ))}
            {data.dealsByStage.length === 0 && (
              <li className="text-sm text-[var(--muted)]">لا صفقات بعد</li>
            )}
          </ul>
        </section>

        <section className="surface-card p-5">
          <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 mb-3">أفضل العملاء</h2>
          <ul className="space-y-2 m-0 p-0 list-none">
            {data.topCustomers.map((c, i) => (
              <li key={`${c.name}-${i}`} className="flex justify-between gap-3 text-sm border-b border-[var(--border)] pb-2">
                <span className="truncate">{c.name}</span>
                <span className="font-bold shrink-0">{c.value.toLocaleString('ar')} ر.س</span>
              </li>
            ))}
            {data.topCustomers.length === 0 && (
              <li className="text-sm text-[var(--muted)]">لا صفقات مكسوبة بعد</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
