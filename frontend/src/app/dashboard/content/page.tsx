'use client';

import { useEffect, useState } from 'react';
import { Copy, Megaphone, Sparkles, Trash2, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/ui';

interface Asset {
  _id: string;
  type: string;
  title: string;
  body: string;
  channels: string[];
  hashtags: string[];
  status: string;
}

export default function ContentStudioPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [topic, setTopic] = useState('عرض نهاية الأسبوع');
  const [type, setType] = useState('post');
  const [channel, setChannel] = useState('instagram');
  const [tone, setTone] = useState('احترافية وحماسية');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = () =>
    api
      .get<Asset[]>('/intelligence/content')
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await api.post('/intelligence/content/generate', { topic, type, channel, tone });
      setMessage('تم توليد المحتوى بالـ AI');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل التوليد');
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (a: Asset) => {
    const text = `${a.body}${a.hashtags?.length ? `\n\n${a.hashtags.join(' ')}` : ''}`;
    await navigator.clipboard.writeText(text);
    setMessage('تم نسخ النص');
  };

  const publish = async (id: string) => {
    setBusyId(id);
    try {
      await api.put(`/intelligence/content/${id}/publish`);
      setMessage('تم تعليم المحتوى كمنشور');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل النشر');
    } finally {
      setBusyId(null);
    }
  };

  const sendWhatsApp = async (id: string) => {
    if (!confirm('إرسال هذا المحتوى كحملة واتساب لكل العملاء المطابقين؟')) return;
    setBusyId(id);
    setMessage('');
    try {
      const res = await api.post<{ campaign: { sent?: number; audience?: number } }>(
        `/intelligence/content/${id}/whatsapp-campaign`,
        {},
      );
      setMessage(`أُرسلت الحملة: ${res.campaign?.sent ?? 0} / ${res.campaign?.audience ?? 0}`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل إرسال الحملة');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="استوديو المحتوى والإعلانات"
        subtitle="AI ينشئ منشورات وإعلانات ونصوص واتساب من معرفة شركتك"
        eyebrow="Content AI"
      />
      {message && (
        <div className={message.includes('فشل') ? 'alert-err' : 'alert-ok'}>{message}</div>
      )}

      <form onSubmit={generate} className="surface-card p-5 sm:p-6 space-y-3 max-w-2xl">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--orange)]" />
          توليد بالـ AI
        </h2>
        <input
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="input-field"
          placeholder="موضوع المحتوى / الحملة"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
            <option value="post">منشور</option>
            <option value="ad">إعلان</option>
            <option value="story">ستوري</option>
            <option value="whatsapp">رسالة واتساب</option>
            <option value="script">سكربت فيديو</option>
          </select>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="input-field">
            <option value="instagram">إنستغرام</option>
            <option value="facebook">فيسبوك</option>
            <option value="tiktok">تيك توك</option>
            <option value="whatsapp">واتساب</option>
            <option value="x">X</option>
          </select>
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="input-field"
            placeholder="النبرة"
          />
        </div>
        <button type="submit" disabled={busy} className="btn-orange disabled:opacity-50">
          {busy ? 'جاري التوليد...' : 'أنشئ الآن'}
        </button>
      </form>

      {loading ? (
        <p className="empty-state">...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="لا محتوى بعد"
          description="اكتب موضوعاً وولّد أول إعلان أو منشور خلال ثوانٍ."
          actionLabel="قاعدة المعرفة"
          actionHref="/dashboard/knowledge"
        />
      ) : (
        <div className="grid gap-4">
          {items.map((a) => (
            <article key={a._id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="badge badge-ok">{a.type}</span>
                  {a.status === 'published' && <span className="badge badge-ok mr-2">منشور</span>}
                  <h3 className="font-bold mt-2 mb-1">{a.title}</h3>
                  <p className="text-xs text-[var(--muted)] m-0">{(a.channels || []).join(' · ')}</p>
                </div>
                <button
                  type="button"
                  className="chip chip-orange text-sm"
                  onClick={() => api.delete(`/intelligence/content/${a._id}`).then(load)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap mt-3 mb-2">{a.body}</p>
              {a.hashtags?.length > 0 && (
                <p className="text-xs text-[var(--teal)] m-0 mb-3">{a.hashtags.join(' ')}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="chip chip-soft text-sm" onClick={() => copyText(a)}>
                  <Copy size={14} /> نسخ
                </button>
                <button
                  type="button"
                  disabled={busyId === a._id}
                  className="chip chip-soft text-sm"
                  onClick={() => publish(a._id)}
                >
                  <Check size={14} /> تعليم منشور
                </button>
                <button
                  type="button"
                  disabled={busyId === a._id}
                  className="btn-teal text-sm !py-1.5"
                  onClick={() => sendWhatsApp(a._id)}
                >
                  <Megaphone size={14} /> حملة واتساب
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
