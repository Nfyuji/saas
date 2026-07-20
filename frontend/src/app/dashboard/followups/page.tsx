'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Send, XCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/ui';

interface FollowUp {
  _id: string;
  status: string;
  step: number;
  type?: string;
  source?: string;
  message?: string;
  scheduledAt: string;
  customerId?: { _id: string; name: string; phone?: string };
}

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    const q = status ? `?status=${status}` : '';
    api
      .get<FollowUp[]>(`/followups${q}`)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [status]);

  const act = async (id: string, action: 'send-now' | 'cancel' | 'reschedule', hours?: number) => {
    setBusyId(id);
    setMessage('');
    try {
      if (action === 'send-now') {
        await api.post(`/followups/${id}/send-now`);
        setMessage('تم إرسال المتابعة الآن');
      } else if (action === 'cancel') {
        await api.put(`/followups/${id}/cancel`);
        setMessage('تم إلغاء المتابعة');
      } else {
        const when = new Date(Date.now() + (hours || 24) * 60 * 60 * 1000).toISOString();
        await api.put(`/followups/${id}/reschedule`, { scheduledAt: when });
        setMessage(`أُعيدت الجدولة بعد ${hours || 24} ساعة`);
      }
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشلت العملية');
    } finally {
      setBusyId(null);
    }
  };

  const typeLabel = (t?: string) =>
    t === 'post_purchase' || t === 'nps' ? 'بعد الشراء' : 'مبيعات';

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="المتابعات الذكية"
        subtitle="جدولة، إرسال فوري، أو إلغاء — مندوب المبيعات لا ينام"
        eyebrow="Follow-ups"
      />

      {message && (
        <div className={message.includes('فشل') ? 'alert-err' : 'alert-ok'}>{message}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          ['pending', 'قيد الانتظار'],
          ['sent', 'أُرسلت'],
          ['cancelled', 'ملغاة'],
          ['failed', 'فشلت'],
          ['', 'الكل'],
        ].map(([v, label]) => (
          <button
            key={v || 'all'}
            type="button"
            className={`chip ${status === v ? 'chip-orange' : 'chip-soft'}`}
            onClick={() => setStatus(v)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty-state">جاري التحميل...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="لا متابعات بهذه الحالة"
          description="عند تفاعل العملاء عبر واتساب تُجدول المتابعات تلقائياً."
          actionLabel="الفرص الضائعة"
          actionHref="/dashboard/opportunities"
        />
      ) : (
        <div className="space-y-3">
          {items.map((fu) => (
            <article key={fu._id} className="surface-card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Link
                      href={fu.customerId?._id ? `/dashboard/customers/${fu.customerId._id}` : '#'}
                      className="font-bold text-[var(--teal-dark)] hover:underline"
                    >
                      {fu.customerId?.name || 'عميل'}
                    </Link>
                    <span className="badge badge-ok">{typeLabel(fu.type)}</span>
                    <span className="chip chip-soft text-[10px]">خطوة {fu.step}</span>
                    <span className="chip chip-soft text-[10px]">{fu.source || 'ai'}</span>
                  </div>
                  <p className="text-sm text-[var(--muted)] m-0" dir="ltr">
                    {fu.customerId?.phone || '—'}
                  </p>
                  <p className="text-sm mt-2 mb-1 whitespace-pre-wrap">{fu.message || '—'}</p>
                  <p className="text-xs text-[var(--muted)] m-0 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(fu.scheduledAt).toLocaleString('ar')}
                  </p>
                </div>

                {fu.status === 'pending' && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyId === fu._id}
                      className="btn-teal text-sm !py-1.5"
                      onClick={() => act(fu._id, 'send-now')}
                    >
                      <Send size={14} /> الآن
                    </button>
                    <button
                      type="button"
                      disabled={busyId === fu._id}
                      className="chip chip-soft text-sm"
                      onClick={() => act(fu._id, 'reschedule', 24)}
                    >
                      <RefreshCw size={14} /> +24س
                    </button>
                    <button
                      type="button"
                      disabled={busyId === fu._id}
                      className="chip chip-orange text-sm"
                      onClick={() => act(fu._id, 'cancel')}
                    >
                      <XCircle size={14} /> إلغاء
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
