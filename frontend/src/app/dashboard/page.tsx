'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  MessagesSquare,
  Handshake,
  Receipt,
  MessageCircle,
  Flame,
  BookOpen,
  CreditCard,
  Smartphone,
  Inbox,
  ArrowUpRight,
  ArrowDownLeft,
  ListTodo,
  Clock3,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EmptyState, QuickLink, SetupChecklist } from '@/components/ui';

interface Stats {
  totalCustomers: number;
  openConversations: number;
  todayMessages: number;
  aiMessages: number;
  openDeals?: number;
  pipelineValue?: number;
  paidRevenue?: number;
  recentConversations: Array<{
    _id: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
    customerId?: { name: string; phone: string };
  }>;
  messagesByDay: Array<{ date: string; inbound: number; outbound: number }>;
}

interface WaStatus {
  configured: boolean;
  demo?: boolean;
  verifiedName?: string;
  displayPhoneNumber?: string;
}

interface FollowUpRow {
  _id: string;
  scheduledAt?: string;
  step?: number;
  message?: string;
  customerId?: { _id?: string; name?: string; phone?: string } | string;
}

interface OpportunityDeal {
  _id: string;
  title?: string;
  value?: number;
  stage?: string;
  lastInboundAt?: string;
  customerId?: { _id?: string; name?: string; phone?: string };
  conversationId?: string;
}

export default function DashboardPage() {
  const { user, company } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [wa, setWa] = useState<WaStatus | null>(null);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [todayTasks, setTodayTasks] = useState<FollowUpRow[]>([]);
  const [waitingNoReply, setWaitingNoReply] = useState<OpportunityDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Stats>('/dashboard/stats').catch(() => null),
      api.get<WaStatus>('/whatsapp/status').catch(() => null),
      api.get<unknown[]>('/knowledge').catch(() => []),
      api.get<FollowUpRow[]>('/followups?status=pending').catch(() => []),
      api
        .get<{ waitingNoReply?: OpportunityDeal[] }>('/followups/opportunities')
        .catch(() => ({ waitingNoReply: [] as OpportunityDeal[] })),
    ])
      .then(([s, w, k, fus, opp]) => {
        if (s) setStats(s);
        if (w) setWa(w);
        setKnowledgeCount(Array.isArray(k) ? k.length : 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const tasks = (Array.isArray(fus) ? fus : []).filter((f) => {
          if (!f.scheduledAt) return true;
          return new Date(f.scheduledAt) <= end;
        }).slice(0, 8);
        setTodayTasks(tasks);
        setWaitingNoReply((opp?.waitingNoReply || []).slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="page-wrap empty-state">جاري تحميل لوحة التشغيل...</div>;
  }

  const cards = [
    {
      label: 'العملاء',
      value: stats?.totalCustomers ?? 0,
      href: '/dashboard/customers',
      tone: 'teal' as const,
      icon: Users,
    },
    {
      label: 'محادثات مفتوحة',
      value: stats?.openConversations ?? 0,
      href: '/dashboard/inbox',
      tone: 'orange' as const,
      icon: MessagesSquare,
    },
    {
      label: 'صفقات مفتوحة',
      value: stats?.openDeals ?? 0,
      href: '/dashboard/deals',
      tone: 'sky' as const,
      icon: Handshake,
    },
    {
      label: 'إيراد محصّل',
      value: stats?.paidRevenue ?? 0,
      href: '/dashboard/invoices',
      tone: 'teal' as const,
      icon: Receipt,
    },
  ];

  const checklist = [
    {
      label: 'ربط واتساب (تجريبي أو Meta)',
      done: !!wa?.configured,
      href: '/dashboard/whatsapp',
    },
    {
      label: 'إضافة أول عميل أو استقبال محادثة',
      done: (stats?.totalCustomers ?? 0) > 0,
      href: '/dashboard/customers',
    },
    {
      label: 'رفع معرفة للمنتجات/الأسعار',
      done: knowledgeCount > 0,
      href: '/dashboard/knowledge',
    },
    {
      label: 'مراجعة الباقة والفوترة',
      done: !!company?.plan && company.plan !== 'free',
      href: '/dashboard/billing',
    },
  ];

  const needsActivation = !wa?.configured || (stats?.totalCustomers ?? 0) === 0;

  return (
    <div className="page-wrap">
      <section className="dash-hero animate-rise">
        <div className="min-w-0">
          <div className="pill pill-teal text-xs !py-1.5 w-fit">لوحة التشغيل</div>
          <h1>مرحباً {user?.name?.split(' ')[0] || ''} — {company?.name || 'شركتك'}</h1>
          <p>
            {wa?.configured
              ? wa.demo
                ? 'وضع واتساب التجريبي مفعّل. جاهز لاختبار AI، أو اربط Meta للإطلاق الحقيقي.'
                : `واتساب متصل${wa.verifiedName ? ` · ${wa.verifiedName}` : ''}. راقب المحادثات والفرص من هنا.`
              : 'ابدأ بربط واتساب خلال دقائق، ثم دع المندوب الذكي يرد ويتابع ويحوّل لفاتورة.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/executive" className="btn-orange text-sm">
            اللوحة التنفيذية
          </Link>
          <Link href="/dashboard/whatsapp" className="btn-teal text-sm">
            <Smartphone size={16} strokeWidth={2.25} />
            {wa?.configured ? 'إدارة واتساب' : 'ربط واتساب الآن'}
          </Link>
          <Link href="/dashboard/inbox" className="btn-ghost text-sm">
            <Inbox size={16} strokeWidth={2.25} />
            صندوق الرسائل
          </Link>
        </div>
      </section>

      {needsActivation && (
        <div className="mb-6 animate-rise animate-rise-delay-1">
          <SetupChecklist items={checklist} />
        </div>
      )}

      <div className="stat-grid animate-rise animate-rise-delay-1">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="mode-card !p-4 !block dash-stat-card">
              <span className={`dash-icon tone-${card.tone}`} aria-hidden>
                <Icon size={20} strokeWidth={2.1} />
              </span>
              <p className="font-display text-2xl sm:text-3xl font-black text-[var(--teal-dark)] mt-3">
                {Number(card.value).toLocaleString('ar')}
              </p>
              <p className="text-[var(--muted)] text-sm mt-1 font-bold">{card.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6 animate-rise animate-rise-delay-1">
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
              <ListTodo size={18} className="text-[var(--teal)]" />
              مهام اليوم
            </h2>
            <span className="text-xs font-bold text-[var(--muted)]">
              {(stats?.todayMessages ?? 0).toLocaleString('ar')} رسالة اليوم
            </span>
          </div>
          {todayTasks.length ? (
            <div className="space-y-1">
              {todayTasks.map((t) => {
                const cust =
                  typeof t.customerId === 'object' && t.customerId
                    ? t.customerId
                    : null;
                return (
                  <Link
                    key={t._id}
                    href={
                      cust?._id
                        ? `/dashboard/customers/${cust._id}`
                        : '/dashboard/opportunities'
                    }
                    className="flex items-start gap-3 p-3 rounded-2xl hover:bg-[var(--teal-soft)]/40 transition"
                  >
                    <Clock3 size={16} className="text-[var(--orange)] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">
                        متابعة {cust?.name || 'عميل'}
                        {t.step ? ` · خطوة ${t.step}` : ''}
                      </p>
                      <p className="text-xs text-[var(--muted)] truncate">
                        {t.scheduledAt
                          ? new Date(t.scheduledAt).toLocaleString('ar')
                          : 'مجدولة'}
                        {t.message ? ` · ${t.message}` : ''}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)] m-0">
              لا متابعات مستحقة اليوم — ركّز على الرسائل غير المقروءة في الصندوق.
            </p>
          )}
        </section>

        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
              <Flame size={18} className="text-[var(--orange)]" />
              فرص بلا رد
            </h2>
            <Link href="/dashboard/opportunities" className="text-xs font-bold text-[var(--teal)]">
              المركز
            </Link>
          </div>
          {waitingNoReply.length ? (
            <div className="space-y-1">
              {waitingNoReply.map((d) => (
                <Link
                  key={d._id}
                  href={
                    d.conversationId
                      ? `/dashboard/inbox?id=${d.conversationId}`
                      : d.customerId?._id
                        ? `/dashboard/customers/${d.customerId._id}`
                        : '/dashboard/opportunities'
                  }
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl hover:bg-[var(--orange-soft)]/50 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">
                      {d.customerId?.name || d.title || 'فرصة'}
                    </p>
                    <p className="text-xs text-[var(--muted)] truncate" dir="ltr">
                      {d.customerId?.phone || '—'}
                    </p>
                  </div>
                  <span className="badge badge-warn shrink-0">
                    {Number(d.value || 0).toLocaleString('ar')}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)] m-0">
              لا فرص تنتظر رداً الآن — هذا مؤشر صحي للفريق.
            </p>
          )}
        </section>
      </div>

      <div className="quick-grid animate-rise animate-rise-delay-2">
        <QuickLink href="/dashboard/inbox" title="صندوق الرسائل" desc="رد ومتابعة المحادثات" icon={MessageCircle} />
        <QuickLink
          href="/dashboard/opportunities"
          title="الفرص الضائعة"
          desc="من ينتظر رداً الآن"
          tone="orange"
          icon={Flame}
        />
        <QuickLink href="/dashboard/deals" title="الصفقات" desc="خط الأنابيب والقيمة" icon={Handshake} />
        <QuickLink
          href="/dashboard/invoices"
          title="الفواتير"
          desc="تحصيل من المحادثة"
          tone="sky"
          icon={Receipt}
        />
        <QuickLink href="/dashboard/knowledge" title="قاعدة المعرفة" desc="علّم AI منتجاتك" icon={BookOpen} />
        <QuickLink
          href="/dashboard/billing"
          title="الاشتراك"
          desc={`الباقة: ${company?.plan || '—'}`}
          tone="orange"
          icon={CreditCard}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
              <MessagesSquare size={18} strokeWidth={2.2} className="text-[var(--teal)]" />
              آخر المحادثات
            </h2>
            <Link href="/dashboard/inbox" className="text-xs font-bold text-[var(--teal)]">
              الكل
            </Link>
          </div>
          {stats?.recentConversations?.length ? (
            <div className="space-y-1">
              {stats.recentConversations.map((c) => (
                <Link
                  key={c._id}
                  href={`/dashboard/inbox?id=${c._id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[var(--teal-soft)]/40 transition min-w-0"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] font-bold shrink-0">
                    {(c.customerId?.name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm truncate">{c.customerId?.name || 'عميل'}</p>
                      {c.unreadCount > 0 && (
                        <span className="bg-[var(--orange)] text-white text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted)] truncate">{c.lastMessage || '—'}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="لا محادثات بعد"
              description="اربط واتساب أو فعّل التجربة ثم أرسل رسالة اختبار لتظهر هنا."
              actionLabel="إعداد واتساب"
              actionHref="/dashboard/whatsapp"
              secondaryLabel="محاكاة رسالة"
              secondaryHref="/dashboard/whatsapp"
            />
          )}
        </div>

        <div className="surface-card p-5 sm:p-6">
          <h2 className="font-display font-extrabold text-lg mb-4 text-[var(--teal-dark)] flex items-center gap-2">
            <MessagesSquare size={18} strokeWidth={2.2} className="text-[var(--orange)]" />
            الرسائل — آخر 7 أيام
          </h2>
          {stats?.messagesByDay?.length ? (
            <div className="space-y-2">
              {stats.messagesByDay.map((d) => {
                const total = d.inbound + d.outbound;
                const maxBar = Math.max(...stats.messagesByDay.map((x) => x.inbound + x.outbound), 1);
                return (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--muted)] w-16 sm:w-20 shrink-0 font-bold" dir="ltr">
                      {d.date.slice(5)}
                    </span>
                    <div className="flex-1 h-6 bg-[var(--teal-soft)]/50 rounded-xl overflow-hidden flex min-w-0">
                      <div className="bg-[var(--teal)] h-full" style={{ width: `${(d.inbound / maxBar) * 100}%` }} />
                      <div className="bg-[var(--orange)] h-full" style={{ width: `${(d.outbound / maxBar) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-left shrink-0">{total}</span>
                  </div>
                );
              })}
              <div className="flex gap-4 mt-4 text-xs text-[var(--muted)] font-bold">
                <span className="flex items-center gap-1">
                  <ArrowDownLeft size={14} className="text-[var(--teal)]" /> واردة
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUpRight size={14} className="text-[var(--orange)]" /> صادرة
                </span>
              </div>
            </div>
          ) : (
            <EmptyState
              title="لا بيانات نشاط بعد"
              description="بعد أول رسائل واتساب ستظهر هنا حركة الوارد والصادر."
              actionLabel="ابدأ من واتساب"
              actionHref="/dashboard/whatsapp"
            />
          )}
        </div>
      </div>
    </div>
  );
}
