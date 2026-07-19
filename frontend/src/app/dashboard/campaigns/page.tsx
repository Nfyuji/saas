'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Megaphone, Eye, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';

export default function CampaignsPage() {
  const [message, setMessage] = useState(
    'مرحباً {name} 🌟 عرض خاص لك هذا الأسبوع — راسلنا لو حاب التفاصيل.',
  );
  const [status, setStatus] = useState('');
  const [tag, setTag] = useState('');
  const [purchasedOnly, setPurchasedOnly] = useState(false);
  const [preview, setPreview] = useState<{
    total: number;
    sample: Array<{ name: string; phone?: string; status: string }>;
  } | null>(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const isError = /فشل|لا عملاء|قصير/i.test(result);

  const audience = { status: status || undefined, tag: tag || undefined, purchasedOnly };

  const runPreview = async () => {
    setLoading(true);
    setResult('');
    try {
      const res = await api.post<{
        total: number;
        sample: Array<{ name: string; phone?: string; status: string }>;
      }>('/campaigns/preview', audience);
      setPreview(res);
      setResult(`الجمهور المتوقع: ${res.total} عميل`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'فشل المعاينة');
    } finally {
      setLoading(false);
    }
  };

  const send = async (dryRun?: boolean) => {
    if (!confirm(dryRun ? 'معاينة إرسال تجريبية؟' : `إرسال الحملة الآن إلى الجمهور المحدد؟`)) return;
    setLoading(true);
    setResult('');
    try {
      const res = await api.post<{
        sent?: number;
        failed?: number;
        audience?: number;
        dryRun?: boolean;
        note?: string;
        message?: string;
      }>('/campaigns/broadcast', { ...audience, message, dryRun: !!dryRun });
      if (res.dryRun) {
        setResult(`تجريبي: سيُرسل إلى ${res.audience} عميل`);
      } else {
        setResult(
          `تم الإرسال: ${res.sent} ناجح · ${res.failed || 0} فشل من ${res.audience}${
            res.note ? ` — ${res.note}` : ''
          }`,
        );
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'فشل الإرسال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap max-w-3xl space-y-6">
      <PageHeader
        title="حملات واتساب"
        subtitle="أرسل عرضاً أو تذكيراً لشريحة عملاء — استخدم {name} لاسم العميل"
        eyebrow="Campaigns"
        actions={
          <Link href="/dashboard/automations" className="btn-ghost text-sm">
            الأتمتة
          </Link>
        }
      />

      {result && <div className={isError ? 'alert-err' : 'alert-ok'}>{result}</div>}

      <section className="surface-card p-5 sm:p-6 space-y-4">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 flex items-center gap-2">
          <Megaphone size={18} className="text-[var(--orange)]" />
          الجمهور
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm font-bold">
            الحالة
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field mt-1.5">
              <option value="">كل الحالات</option>
              <option value="lead">عميل محتمل</option>
              <option value="prospect">مهتم</option>
              <option value="customer">عميل</option>
              <option value="vip">VIP</option>
            </select>
          </label>
          <label className="block text-sm font-bold">
            وسم
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="input-field mt-1.5"
              placeholder="purchased أو مهتم..."
            />
          </label>
        </div>
        <label className="flex items-center gap-3 text-sm font-bold cursor-pointer">
          <input
            type="checkbox"
            checked={purchasedOnly}
            onChange={(e) => setPurchasedOnly(e.target.checked)}
            className="size-4 accent-[var(--teal)]"
          />
          المشترون فقط (عميل / VIP / وسم purchased)
        </label>
        <button type="button" onClick={runPreview} disabled={loading} className="btn-ghost disabled:opacity-50">
          <Eye size={15} />
          معاينة الجمهور
        </button>
        {preview && (
          <div className="rounded-2xl bg-[var(--teal-soft)]/40 p-3 text-sm">
            <p className="font-bold m-0 mb-2">{preview.total} عميل</p>
            <ul className="m-0 space-y-1 text-[var(--muted)]">
              {preview.sample.map((c, i) => (
                <li key={i}>
                  {c.name} · <span dir="ltr">{c.phone || '—'}</span> · {c.status}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="surface-card p-5 sm:p-6 space-y-4">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0">نص الحملة</h2>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="input-field"
          placeholder="مرحباً {name}..."
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => send(true)} disabled={loading} className="btn-ghost disabled:opacity-50">
            تجربة بدون إرسال
          </button>
          <button type="button" onClick={() => send(false)} disabled={loading} className="btn-orange disabled:opacity-50">
            <Send size={15} />
            {loading ? 'جاري...' : 'إرسال الحملة'}
          </button>
        </div>
        <p className="text-xs text-[var(--muted)] m-0">
          للأرقام الحقيقية خارج نافذة 24 ساعة قد تحتاج قالب Meta معتمد. المتابعة التلقائية بعد الشراء تعمل من تلقاء نفسها عند تأكيد الدفع.
        </p>
      </section>
    </div>
  );
}
