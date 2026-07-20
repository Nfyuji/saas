'use client';

import { useEffect, useState } from 'react';
import { Target, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/ui';

interface Competitor {
  _id: string;
  name: string;
  website?: string;
  channels?: string[];
  notes?: string;
  lastAnalysis?: {
    at?: string;
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    contentIdeas?: string[];
  };
}

export default function CompetitorsPage() {
  const [items, setItems] = useState<Competitor[]>([]);
  const [form, setForm] = useState({ name: '', website: '', notes: '' });
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');

  const load = () => api.get<Competitor[]>('/intelligence/competitors').then(setItems).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/intelligence/competitors', form);
    setForm({ name: '', website: '', notes: '' });
    load();
  };

  const analyze = async (id: string) => {
    setBusyId(id);
    setMessage('');
    try {
      await api.post(`/intelligence/competitors/${id}/analyze`);
      setMessage('تم تحليل المنافس بالـ AI');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل التحليل');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="تحليل المنافسين"
        subtitle="AI يقارن نقاط القوة والضعف ويقترح محتوى مضاد"
        eyebrow="Competitor AI"
      />
      {message && <div className="alert-ok">{message}</div>}

      <form onSubmit={add} className="surface-card p-5 space-y-3 max-w-xl">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0">إضافة منافس</h2>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input-field"
          placeholder="اسم المنافس"
        />
        <input
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          className="input-field"
          placeholder="الموقع"
          dir="ltr"
        />
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="input-field"
          rows={3}
          placeholder="ملاحظات: أسعارهم، قنواتهم، عروضهم..."
        />
        <button type="submit" className="btn-teal">
          حفظ
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="لا منافسين مسجّلين"
          description="أضف منافساً ثم اطلب تحليلاً بالـ AI لاستخراج فرص التميّز."
        />
      ) : (
        <div className="grid gap-4">
          {items.map((c) => (
            <article key={c._id} className="surface-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-bold m-0 flex items-center gap-2">
                    <Target size={16} className="text-[var(--orange)]" />
                    {c.name}
                  </h3>
                  {c.website && (
                    <p className="text-sm text-[var(--muted)] m-0 mt-1" dir="ltr">
                      {c.website}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-orange text-sm"
                    disabled={busyId === c._id}
                    onClick={() => analyze(c._id)}
                  >
                    {busyId === c._id ? '...' : 'حلّل بالـ AI'}
                  </button>
                  <button
                    type="button"
                    className="chip chip-orange text-sm"
                    onClick={() => api.delete(`/intelligence/competitors/${c._id}`).then(load)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {c.lastAnalysis?.summary && (
                <div className="rounded-2xl bg-[var(--teal-soft)]/40 p-3 text-sm space-y-2">
                  <p className="m-0 font-bold">{c.lastAnalysis.summary}</p>
                  <p className="m-0">
                    <strong>قوة:</strong> {(c.lastAnalysis.strengths || []).join(' · ')}
                  </p>
                  <p className="m-0">
                    <strong>ضعف:</strong> {(c.lastAnalysis.weaknesses || []).join(' · ')}
                  </p>
                  <p className="m-0">
                    <strong>فرص:</strong> {(c.lastAnalysis.opportunities || []).join(' · ')}
                  </p>
                  <p className="m-0">
                    <strong>أفكار محتوى:</strong> {(c.lastAnalysis.contentIdeas || []).join(' · ')}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
