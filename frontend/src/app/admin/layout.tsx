'use client';

import { useEffect, useState, ElementType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Star,
  CreditCard,
  BarChart3,
  Users,
  Shield,
  Activity,
  Settings,
  UserRound,
  Ban,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const nav: Array<{ href: string; label: string; icon: ElementType }> = [
  { href: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/admin/subscribers', label: 'المشتركون', icon: Building2 },
  { href: '/admin/plans', label: 'الباقات', icon: Star },
  { href: '/admin/payments', label: 'المدفوعات', icon: CreditCard },
  { href: '/admin/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/admin/users', label: 'المستخدمون', icon: Users },
  { href: '/admin/staff', label: 'أدمن المنصة', icon: Shield },
  { href: '/admin/device-bans', label: 'حظر الأجهزة', icon: Ban },
  { href: '/admin/activity', label: 'النشاط', icon: Activity },
  { href: '/admin/settings', label: 'إعدادات المنصة', icon: Settings },
  { href: '/admin/profile', label: 'الملف الشخصي', icon: UserRound },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isPlatformAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isPlatformAdmin)) {
      router.push('/login');
    }
  }, [user, loading, isPlatformAdmin, router]);

  useEffect(() => {
    setMenuOpen(false);
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

  if (loading || !user || !isPlatformAdmin) {
    return (
      <div className="app-shell flex items-center justify-center p-6">
        <div className="animate-pulse text-[var(--muted)]">جاري التحميل...</div>
      </div>
    );
  }

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
        <div className="min-w-0 flex-1 text-center">
          <p className="font-display font-black text-[var(--teal-dark)] text-sm truncate">
            ◆ BusinessOS <span className="text-[var(--orange)]">AI</span>
          </p>
          <p className="text-[10px] text-[var(--muted)] truncate">لوحة أدمن المنصة</p>
        </div>
        <div className="pill pill-teal text-[10px] !py-1 !px-2.5">Admin</div>
      </header>

      <button
        type="button"
        className={`app-backdrop ${menuOpen ? 'is-open' : ''}`}
        aria-label="إغلاق القائمة"
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`app-sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="قائمة الأدمن">
        <div className="p-4 sm:p-5 border-b border-[var(--border)]">
          <div className="flex items-center justify-between gap-2">
            <div className="font-display font-black text-lg text-[var(--teal-dark)] min-w-0">
              ◆ BusinessOS <span className="text-[var(--orange)]">AI</span>
            </div>
            <button type="button" className="app-menu-btn lg:hidden" aria-label="إغلاق" onClick={() => setMenuOpen(false)}>
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">لوحة أدمن المنصة</p>
          <div className="pill pill-teal mt-3 text-xs !py-1.5 !px-3 w-fit">Control</div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overscroll-contain">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
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
          <Link
            href="/admin/profile"
            className="flex items-center gap-3 mb-3 min-w-0 no-underline text-inherit rounded-2xl hover:bg-[var(--teal-soft)]/50 p-1.5 -m-1.5 transition"
          >
            <div className="w-9 h-9 rounded-full bg-[var(--teal)] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate m-0">{user.name}</p>
              <p className="text-xs text-[var(--muted)] truncate m-0">الملف الشخصي</p>
            </div>
          </Link>
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

      <main className="app-main pt-[4.25rem] lg:pt-[var(--page-pad)]">{children}</main>
    </div>
  );
}
