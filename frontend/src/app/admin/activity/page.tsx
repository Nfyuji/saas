'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ActivityItem {
  _id: string;
  kind?: 'audit' | 'message';
  action?: string;
  content?: string;
  direction?: string;
  type?: string;
  isAiGenerated?: boolean;
  actorEmail?: string;
  targetType?: string;
  createdAt?: string;
  company?: { name?: string } | string;
  customer?: { name?: string; phone?: string } | string;
}

export default function AdminActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'audit' | 'message'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ActivityItem[]>('/platform-admin/activity')
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const visible = items.filter((i) => {
    if (filter === 'all') return true;
    if (filter === 'audit') return i.kind === 'audit' || !!i.action;
    return i.kind === 'message' || !!i.direction;
  });

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="page-title">النشاط</h1>
          <p className="page-sub">سجل تدقيق الأدمن + رسائل واتساب عبر المنصة</p>
        </div>
        <div className="flex gap-2">
          {[
            ['all', 'الكل'],
            ['audit', 'تدقيق الأدمن'],
            ['message', 'الرسائل'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id as typeof filter)}
              className={`chip ${filter === id ? 'chip-teal' : 'chip-soft'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="surface-card p-6">
        {loading ? (
          <p className="empty-state">جاري التحميل...</p>
        ) : visible.length === 0 ? (
          <p className="empty-state">لا يوجد نشاط بعد</p>
        ) : (
          <div className="space-y-3">
            {visible.map((m) => {
              const isAudit = m.kind === 'audit' || !!m.action;
              const companyName =
                typeof m.company === 'object' && m.company ? m.company.name : '—';
              const customerName =
                typeof m.customer === 'object' && m.customer ? m.customer.name : 'عميل';

              return (
                <div key={String(m._id)} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--teal-soft)]/30 border border-transparent hover:border-[var(--border)]">
                  <div
                    className={`icon-badge text-sm font-bold ${
                      isAudit
                        ? 'orange'
                        : m.direction === 'inbound'
                          ? 'teal'
                          : 'sky'
                    }`}
                  >
                    {isAudit ? '⚡' : m.direction === 'inbound' ? '↓' : '↑'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isAudit ? (
                      <>
                        <p className="font-medium text-sm">{m.action}</p>
                        <p className="text-sm text-[var(--muted)] mt-1 truncate">{m.content || m.targetType || '—'}</p>
                        <p className="text-xs text-[var(--muted)] mt-1">
                          {m.actorEmail || 'admin'} · {m.createdAt ? new Date(m.createdAt).toLocaleString('ar') : ''}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{companyName}</p>
                          <span className="text-xs text-[var(--muted)]">·</span>
                          <p className="text-xs text-[var(--muted)]">{customerName}</p>
                          {m.isAiGenerated && (
                            <span className="badge badge-warn">AI</span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--muted)] mt-1 truncate">{m.content || `[${m.type}]`}</p>
                        <p className="text-xs text-[var(--muted)] mt-1">
                          {m.createdAt ? new Date(m.createdAt).toLocaleString('ar') : ''}
                          {' · '}
                          {m.direction === 'inbound' ? 'واردة' : 'صادرة'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
