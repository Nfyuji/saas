'use client';

import Link from 'next/link';
import { ReactNode, ElementType } from 'react';
import { Check, Circle } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="min-w-0">
        {eyebrow && <div className="pill pill-teal mb-3 text-xs !py-1.5 w-fit">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <div className="empty-panel">
      <h3>{title}</h3>
      <p>{description}</p>
      {(actionLabel || secondaryLabel) && (
        <div className="empty-panel-actions">
          {actionLabel && actionHref ? (
            <Link href={actionHref} className="btn-orange text-sm">
              {actionLabel}
            </Link>
          ) : null}
          {actionLabel && onAction && !actionHref ? (
            <button type="button" onClick={onAction} className="btn-orange text-sm">
              {actionLabel}
            </button>
          ) : null}
          {secondaryLabel && secondaryHref ? (
            <Link href={secondaryHref} className="btn-ghost text-sm">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function QuickLink({
  href,
  title,
  desc,
  tone = 'teal',
  icon: Icon,
}: {
  href: string;
  title: string;
  desc: string;
  tone?: 'teal' | 'orange' | 'sky';
  icon?: ElementType;
}) {
  return (
    <Link href={href} className={`quick-link tone-${tone}`}>
      <div className="quick-link-row">
        {Icon && (
          <span className={`dash-icon tone-${tone}`} aria-hidden>
            <Icon size={18} strokeWidth={2.1} />
          </span>
        )}
        <div className="min-w-0">
          <strong>{title}</strong>
          <span>{desc}</span>
        </div>
      </div>
    </Link>
  );
}

export function SetupChecklist({
  items,
}: {
  items: Array<{ label: string; done: boolean; href: string }>;
}) {
  const remaining = items.filter((i) => !i.done).length;
  return (
    <div className="setup-checklist">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0">جاهزية الإطلاق</h2>
        <span className="text-xs font-bold text-[var(--muted)]">
          {remaining === 0 ? 'مكتمل ✓' : `${remaining} خطوات متبقية`}
        </span>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className={item.done ? 'is-done' : ''}>
              <span className="check" aria-hidden>
                {item.done ? <Check size={12} strokeWidth={3} /> : <Circle size={10} strokeWidth={2.5} />}
              </span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
