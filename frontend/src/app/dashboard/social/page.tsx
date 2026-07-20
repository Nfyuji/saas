'use client';

import { useEffect, useState } from 'react';
import { Share2, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/ui';

interface Account {
  _id: string;
  channel: string;
  displayName: string;
  handle?: string;
  status: string;
  inboxEnabled: boolean;
  postingEnabled: boolean;
}

const channels = [
  { id: 'whatsapp', label: 'واتساب' },
  { id: 'instagram', label: 'إنستغرام' },
  { id: 'facebook', label: 'فيسبوك' },
  { id: 'tiktok', label: 'تيك توك' },
  { id: 'x', label: 'X / تويتر' },
  { id: 'linkedin', label: 'لينكدإن' },
  { id: 'youtube', label: 'يوتيوب' },
];

export default function SocialPage() {
  const [items, setItems] = useState<Account[]>([]);
  const [form, setForm] = useState({ channel: 'instagram', displayName: '', handle: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .get<Account[]>('/intelligence/social')
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/intelligence/social', { ...form, status: 'pending' });
      setForm({ channel: 'instagram', displayName: '', handle: '' });
      setMessage('تمت إضافة الحساب — الربط الكامل عبر OAuth يُفعَّل بمفاتيح القناة');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل');
    }
  };

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="حسابات التواصل"
        subtitle="إدارة كل القنوات في مكان واحد — صندوق موحّد + نشر لاحقاً"
        eyebrow="Social Hub"
      />
      {message && <div className="alert-ok">{message}</div>}

      <form onSubmit={add} className="surface-card p-5 sm:p-6 space-y-3 max-w-xl">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
          <Plus size={18} /> إضافة قناة
        </h2>
        <select
          value={form.channel}
          onChange={(e) => setForm({ ...form, channel: e.target.value })}
          className="input-field"
        >
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          required
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="input-field"
          placeholder="اسم العرض"
        />
        <input
          value={form.handle}
          onChange={(e) => setForm({ ...form, handle: e.target.value })}
          className="input-field"
          placeholder="@handle"
          dir="ltr"
        />
        <button type="submit" className="btn-teal">
          حفظ القناة
        </button>
      </form>

      {loading ? (
        <p className="empty-state">جاري التحميل...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="لا حسابات بعد"
          description="أضف إنستغرام/فيسبوك/تيك توك بجانب واتساب لبناء صندوق رسائل موحّد."
          actionLabel="ربط واتساب"
          actionHref="/dashboard/whatsapp"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((a) => (
            <div key={a._id} className="surface-card p-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-bold m-0 flex items-center gap-2">
                  <Share2 size={16} className="text-[var(--teal)]" />
                  {a.displayName}
                </p>
                <p className="text-sm text-[var(--muted)] mt-1 mb-0">
                  {channels.find((c) => c.id === a.channel)?.label || a.channel}
                  {a.handle ? ` · ${a.handle}` : ''}
                </p>
                <span className={`badge mt-2 ${a.status === 'connected' ? 'badge-ok' : 'badge-warn'}`}>
                  {a.status}
                </span>
              </div>
              <button
                type="button"
                className="chip chip-orange text-sm"
                onClick={() => api.delete(`/intelligence/social/${a._id}`).then(load)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
