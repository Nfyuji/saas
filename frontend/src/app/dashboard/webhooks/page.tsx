'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Hook {
  _id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
}

const ALL_EVENTS = ['message.received', 'message.sent', 'deal.updated', 'invoice.created'];

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');

  const load = () => api.get<Hook[]>('/webhooks/outbound').then(setHooks).catch(console.error);
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/webhooks/outbound', { url, events: ALL_EVENTS });
    setUrl('');
    setMessage('تم إضافة Webhook');
    load();
  };

  return (
    <div className="page-wrap max-w-3xl">
      <h1 className="page-title mb-2">Webhooks للعملاء</h1>
      <p className="page-sub mb-6">استقبل أحداث الرسائل والصفقات والفواتير على سيرفرك</p>
      {message && <div className="alert-ok">{message}</div>}

      <form onSubmit={create} className="surface-card p-6 space-y-3 mb-6">
        <input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-server.com/hook" className="input-field" dir="ltr" />
        <button className="btn-teal w-full justify-center">إضافة</button>
      </form>

      <div className="space-y-3">
        {hooks.map((h) => (
          <div key={h._id} className="surface-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium break-all" dir="ltr">{h.url}</p>
              <span className={`badge ${h.isActive ? 'badge-ok' : 'badge-off'}`}>
                {h.isActive ? 'نشط' : 'موقوف'}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">{h.events.join(', ')}</p>
            <p className="text-xs text-[var(--muted)] mt-1" dir="ltr">secret: {h.secret}</p>
            <button
              onClick={() => api.delete(`/webhooks/outbound/${h._id}`).then(load)}
              className="chip chip-orange mt-3"
            >
              حذف
            </button>
          </div>
        ))}
        {!hooks.length && (
          <div className="surface-card empty-state">لا webhooks بعد</div>
        )}
      </div>
    </div>
  );
}
