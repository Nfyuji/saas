'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  MessageCircle,
  Users,
  Handshake,
  Share2,
  BookOpen,
  Megaphone,
  TrendingUp,
  Bot,
  Target,
  Workflow,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';

interface Briefing {
  kpis: {
    customers: number;
    openConversations: number;
    unreadMessages: number;
    todayMessages: number;
    openDeals: number;
    pipelineValue: number;
    paidToday: number;
    socialConnected: number;
    socialTotal: number;
    knowledgeDocs: number;
  };
  channels: Array<{ id: string; label: string; ready: boolean }>;
  briefing: {
    headline: string;
    summary: string;
    suggestions: Array<{ priority: string; title: string; detail: string; href?: string }>;
  };
  platformMap: Array<{ key: string; label: string; href: string; ready: boolean }>;
  waitingDeals: Array<{ _id: string; title?: string; value?: number; customerId?: { name?: string } }>;
}

const icons: Record<string, typeof Users> = {
  crm: Users,
  social: Share2,
  campaigns: Megaphone,
  inbox: MessageCircle,
  rag: BookOpen,
  agent: Bot,
  competitors: Target,
  content: Sparkles,
  forecast: TrendingUp,
  workflows: Workflow,
  executive: Sparkles,
};

export default function ExecutivePage() {
  const [data, setData] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Briefing>('/intelligence/executive')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-wrap empty-state">جاري تجهيز الملخص التنفيذي...</div>;
  if (!data) return <div className="page-wrap alert-err">تعذّر تحميل اللوحة</div>;

  const k = data.kpis;

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="اللوحة التنفيذية"
        subtitle={data.briefing.headline || 'مؤشرات اليوم + اقتراحات AI'}
        eyebrow="Executive OS"
        actions={
          <button type="button" className="btn-ghost text-sm" onClick={() => window.location.reload()}>
            تحديث اليوم
          </button>
        }
      />

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="dash-icon tone-orange" aria-hidden>
            <Sparkles size={20} />
          </span>
          <div>
            <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0">
              {data.briefing.headline}
            </h2>
            <p className="text-sm text-[var(--muted)] mt-2 mb-0">{data.briefing.summary}</p>
          </div>
        </div>
      </section>

      <div className="stat-grid">
        {[
          { label: 'رسائل اليوم', value: k.todayMessages },
          { label: 'غير مقروء', value: k.unreadMessages },
          { label: 'صفقات مفتوحة', value: k.openDeals },
          { label: 'خط الأنابيب', value: k.pipelineValue },
          { label: 'محصّل اليوم', value: k.paidToday },
          { label: 'عملاء', value: k.customers },
        ].map((c) => (
          <div key={c.label} className="mode-card !p-4">
            <p className="font-display text-2xl font-black text-[var(--teal-dark)] m-0">
              {Number(c.value).toLocaleString('ar')}
            </p>
            <p className="text-sm text-[var(--muted)] font-bold mt-1 mb-0">{c.label}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] mb-3">
          اقتراحات اليوم
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {data.briefing.suggestions?.map((s, i) => (
            <Link
              key={i}
              href={s.href || '/dashboard'}
              className="surface-card p-4 block no-underline hover:border-[var(--teal)]"
            >
              <span
                className={`badge ${
                  s.priority === 'high' ? 'badge-warn' : s.priority === 'low' ? 'badge-off' : 'badge-ok'
                }`}
              >
                {s.priority === 'high' ? 'عاجل' : s.priority === 'low' ? 'لاحقاً' : 'مهم'}
              </span>
              <p className="font-bold text-[var(--teal-dark)] mt-2 mb-1">{s.title}</p>
              <p className="text-sm text-[var(--muted)] m-0">{s.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] mb-3">
          منصة النمو الموحّدة
        </h2>
        <div className="quick-grid">
          {data.platformMap.map((p) => {
            const Icon = icons[p.key] || Sparkles;
            return (
              <Link key={p.key} href={p.href} className="quick-link tone-teal">
                <div className="quick-link-row">
                  <span className="dash-icon tone-teal" aria-hidden>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <strong>{p.label}</strong>
                    <span>{p.ready ? 'جاهز' : 'قريباً'}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 mb-3">
          القنوات
        </h2>
        <div className="flex flex-wrap gap-2">
          {data.channels.map((c) => (
            <span key={c.id} className={`badge ${c.ready ? 'badge-ok' : 'badge-off'}`}>
              {c.label} {c.ready ? '●' : '○'}
            </span>
          ))}
        </div>
        <Link href="/dashboard/social" className="btn-ghost text-sm mt-4 inline-flex">
          إدارة الحسابات
        </Link>
      </section>
    </div>
  );
}
