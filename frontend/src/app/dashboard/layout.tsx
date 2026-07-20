'use client';

import { useEffect, useState, ElementType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MessageCircle,
  Flame,
  Handshake,
  Receipt,
  Users,
  BookOpen,
  Workflow,
  CreditCard,
  UsersRound,
  Webhook,
  Smartphone,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  Activity,
  UserRound,
  Megaphone,
  Sparkles,
  Share2,
  Target,
  TrendingUp,
  Crown,
  Clock,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface UsageDash {
  plan: { code: string; name: string };
  usage: { messagesPerDay: number };
  limits: { messagesPerDay?: number };
  meters?: Array<{ key: string; used: number; limit: number | null; percent: number | null }>;
  daysLeft: number | null;
  alerts: Array<{ type: 'warn' | 'danger' | 'info'; code: string; text: string; href?: string }>;
}

interface AppNotification {
  _id: string;
  title: string;
  body: string;
  level: string;
  href?: string;
  read: boolean;
}

const allNav: Array<{
  href: string;
  label: string;
  icon: ElementType;
  feature?: 'opportunitiesEnabled' | 'invoicesEnabled' | 'knowledgeEnabled';
}> = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/dashboard/executive', label: 'تنفيذية يومية', icon: Crown },
  { href: '/dashboard/inbox', label: 'صندوق موحّد', icon: MessageCircle },
  { href: '/dashboard/followups', label: 'المتابعات', icon: Clock },
  { href: '/dashboard/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/dashboard/social', label: 'حسابات التواصل', icon: Share2 },
  { href: '/dashboard/content', label: 'محتوى وإعلانات AI', icon: Sparkles },
  { href: '/dashboard/campaigns', label: 'الحملات', icon: Megaphone },
  { href: '/dashboard/competitors', label: 'تحليل المنافسين', icon: Target },
  { href: '/dashboard/forecast', label: 'تنبؤ المبيعات', icon: TrendingUp },
  { href: '/dashboard/opportunities', label: 'الفرص الضائعة', icon: Flame, feature: 'opportunitiesEnabled' },
  { href: '/dashboard/deals', label: 'الصفقات', icon: Handshake },
  { href: '/dashboard/invoices', label: 'الفواتير', icon: Receipt, feature: 'invoicesEnabled' },
  { href: '/dashboard/customers', label: 'CRM العملاء', icon: Users },
  { href: '/dashboard/knowledge', label: 'RAG المعرفة', icon: BookOpen, feature: 'knowledgeEnabled' },
  { href: '/dashboard/automations', label: 'أتمتة AI', icon: Workflow },
  { href: '/dashboard/billing', label: 'الاشتراك', icon: CreditCard },
  { href: '/dashboard/usage', label: 'استخدام الباقة', icon: Activity },
  { href: '/dashboard/team', label: 'الفريق', icon: UsersRound },
  { href: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/dashboard/whatsapp', label: 'واتساب / الوكيل', icon: Smartphone },
  { href: '/dashboard/profile', label: 'الملف الشخصي', icon: UserRound },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, company, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [usage, setUsage] = useState<UsageDash | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user?.role === 'super_admin') router.push('/admin');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || user.role === 'super_admin') return;
    api
      .get<UsageDash>('/billing/usage')
      .then(setUsage)
      .catch(() => setUsage(null));
    api
      .get<AppNotification[]>('/notifications?limit=20')
      .then(setNotifications)
      .catch(() => setNotifications([]));
    const t = setInterval(() => {
      api.get<UsageDash>('/billing/usage').then(setUsage).catch(() => undefined);
      api.get<AppNotification[]>('/notifications?limit=20').then(setNotifications).catch(() => undefined);
    }, 60_000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    setMenuOpen(false);
    setAlertsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  if (loading || !user) {
    return (
      <div className="app-shell flex items-center justify-center p-6">
        <div className="animate-pulse text-[var(--muted)]">جاري التحميل...</div>
      </div>
    );
  }

  const nav = allNav.filter((item) => {
    if (!item.feature) return true;
    const flag = company?.settings?.[item.feature];
    return flag !== false;
  });

  const msgMeter = usage?.meters?.find((m) => m.key === 'messagesPerDay');
  const msgUsed = msgMeter?.used ?? usage?.usage?.messagesPerDay ?? 0;
  const msgLimit = msgMeter?.limit ?? usage?.limits?.messagesPerDay ?? null;
  const msgPct =
    msgMeter?.percent ??
    (msgLimit != null && msgLimit > 0 ? Math.min(100, Math.round((msgUsed / msgLimit) * 100)) : null);
  const alerts = usage?.alerts || [];
  const unreadNotes = notifications.filter((n) => !n.read);
  const alertCount = alerts.length + unreadNotes.length;

  const markNotesRead = () => {
    api.put('/notifications/read-all').then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }).catch(() => undefined);
  };

  return (
    <div className="app-frame">
      <header className="app-topbar w-full fixed top-0 inset-x-0 lg:static">
        <button
          type="button"
          className="app-menu-btn"
          aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={18} strokeWidth={2.4} /> : <Menu size={18} strokeWidth={2.4} />}
        </button>
        <div className="min-w-0 flex-1 text-center lg:text-start">
          <p className="font-display font-black text-[var(--teal-dark)] text-sm truncate">
            ◆ BusinessOS <span className="text-[var(--orange)]">AI</span>
          </p>
          <p className="text-[10px] text-[var(--muted)] truncate">{company?.name}</p>
        </div>

        {usage && (
          <Link href="/dashboard/usage" className="usage-chip" title="استخدام الباقة">
            <span className="usage-chip-label">
              {(usage.plan?.name || company?.plan || 'plan').slice(0, 12)}
              {msgLimit != null ? ` · ${msgUsed}/${msgLimit}` : ` · ${msgUsed} رسالة`}
            </span>
            {msgPct != null && (
              <span className="usage-chip-bar" aria-hidden>
                <span
                  className={`usage-chip-fill ${msgPct >= 90 ? 'is-danger' : msgPct >= 70 ? 'is-warn' : ''}`}
                  style={{ width: `${msgPct}%` }}
                />
              </span>
            )}
          </Link>
        )}

        <div className="relative shrink-0">
          <button
            type="button"
            className="alerts-btn"
            aria-label="التنبيهات"
            aria-expanded={alertsOpen}
            onClick={() => setAlertsOpen((v) => !v)}
          >
            <Bell size={16} strokeWidth={2.3} />
            {alertCount > 0 && <span className="alerts-dot">{alertCount > 9 ? '9+' : alertCount}</span>}
          </button>
          {alertsOpen && (
            <div className="alerts-panel" role="menu">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold text-[var(--muted)] m-0">تنبيهات التشغيل</p>
                {unreadNotes.length > 0 && (
                  <button type="button" className="text-[10px] text-[var(--teal)] font-bold" onClick={markNotesRead}>
                    تعليم الكل مقروء
                  </button>
                )}
              </div>
              {alerts.length === 0 && notifications.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">لا تنبيهات الآن</p>
              ) : (
                <ul className="space-y-2">
                  {unreadNotes.slice(0, 8).map((n) => (
                    <li key={n._id}>
                      {n.href ? (
                        <Link
                          href={n.href}
                          className={`alerts-item type-${n.level === 'danger' ? 'danger' : n.level === 'warn' ? 'warn' : 'info'}`}
                          onClick={() => {
                            api.put(`/notifications/${n._id}/read`).catch(() => undefined);
                            setAlertsOpen(false);
                          }}
                        >
                          <strong className="block">{n.title}</strong>
                          <span className="text-xs opacity-80">{n.body}</span>
                        </Link>
                      ) : (
                        <span className={`alerts-item type-${n.level === 'danger' ? 'danger' : 'info'}`}>
                          <strong className="block">{n.title}</strong>
                          <span className="text-xs opacity-80">{n.body}</span>
                        </span>
                      )}
                    </li>
                  ))}
                  {alerts.map((a) => (
                    <li key={a.code}>
                      {a.href ? (
                        <Link
                          href={a.href}
                          className={`alerts-item type-${a.type}`}
                          onClick={() => setAlertsOpen(false)}
                        >
                          {a.text}
                        </Link>
                      ) : (
                        <span className={`alerts-item type-${a.type}`}>{a.text}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {usage?.daysLeft != null && (
                <p className="text-[10px] text-[var(--muted)] mt-3">
                  متبقي من الاشتراك: {usage.daysLeft} يوم
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      <button
        type="button"
        className={`app-backdrop ${menuOpen ? 'is-open' : ''}`}
        aria-label="إغلاق القائمة"
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`app-sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="القائمة الجانبية">
        <div className="p-4 sm:p-5 border-b border-[var(--border)]">
          <div className="flex items-center justify-between gap-2">
            <div className="font-display font-black text-lg text-[var(--teal-dark)] min-w-0">
              ◆ BusinessOS <span className="text-[var(--orange)]">AI</span>
            </div>
            <button type="button" className="app-menu-btn lg:hidden" aria-label="إغلاق" onClick={() => setMenuOpen(false)}>
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1 truncate">{company?.name}</p>
          <div className="pill pill-teal mt-3 text-xs !py-1.5 !px-3 w-fit max-w-full truncate">
            {usage?.plan?.name || company?.plan || 'starter'}
          </div>
          {usage && (
            <Link href="/dashboard/usage" className="usage-side block no-underline">
              <div className="usage-side-meta">
                <span>رسائل اليوم</span>
                <span dir="ltr">
                  {msgUsed}
                  {msgLimit != null ? `/${msgLimit}` : ''}
                </span>
              </div>
              {msgPct != null && (
                <span className="usage-chip-bar" aria-hidden>
                  <span
                    className={`usage-chip-fill ${msgPct >= 90 ? 'is-danger' : msgPct >= 70 ? 'is-warn' : ''}`}
                    style={{ width: `${msgPct}%` }}
                  />
                </span>
              )}
              {alertCount > 0 && (
                <p className="text-[10px] font-bold text-[var(--orange-dark)] mt-2 m-0">
                  {alertCount} تنبيه نشط
                </p>
              )}
            </Link>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overscroll-contain">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition min-w-0 ${
                  active ? 'nav-active' : 'text-[var(--muted)] hover:bg-[var(--teal-soft)]/50'
                }`}
              >
                <span className={`nav-icon ${active ? 'is-active' : ''}`} aria-hidden>
                  <Icon size={18} strokeWidth={2.15} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <Link
              href="/dashboard/profile"
              className="w-9 h-9 rounded-full bg-[var(--teal)] flex items-center justify-center text-white text-sm font-bold shrink-0 no-underline"
              title="الملف الشخصي"
            >
              {user.name.charAt(0)}
            </Link>
            <Link href="/dashboard/profile" className="flex-1 min-w-0 no-underline text-inherit">
              <p className="text-sm font-bold truncate m-0">{user.name}</p>
              <p className="text-xs text-[var(--muted)] truncate m-0">{user.email}</p>
            </Link>
            <div className="relative shrink-0 hidden lg:block">
              <button
                type="button"
                className="alerts-btn"
                aria-label="التنبيهات"
                onClick={() => setAlertsOpen((v) => !v)}
              >
                <Bell size={16} strokeWidth={2.3} />
                {alertCount > 0 && <span className="alerts-dot">{alertCount > 9 ? '9+' : alertCount}</span>}
              </button>
              {alertsOpen && (
                <div className="alerts-panel is-up" role="menu">
                  <p className="text-xs font-bold text-[var(--muted)] mb-2">تنبيهات التشغيل</p>
                  {alerts.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">لا تنبيهات الآن</p>
                  ) : (
                    <ul className="space-y-2">
                      {alerts.map((a) => (
                        <li key={`side-${a.code}`}>
                          {a.href ? (
                            <Link
                              href={a.href}
                              className={`alerts-item type-${a.type}`}
                              onClick={() => setAlertsOpen(false)}
                            >
                              {a.text}
                            </Link>
                          ) : (
                            <span className={`alerts-item type-${a.type}`}>{a.text}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full text-sm font-bold text-[var(--orange)] hover:bg-[var(--orange-soft)] py-2 rounded-xl transition inline-flex items-center justify-center gap-2"
          >
            <LogOut size={15} strokeWidth={2.3} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  );
}
