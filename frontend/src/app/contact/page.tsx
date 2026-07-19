'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`طلب تواصل — ${form.company || form.name}`);
    const body = encodeURIComponent(
      `الاسم: ${form.name}\nالشركة: ${form.company}\nالبريد: ${form.email}\n\n${form.message}`,
    );
    window.location.href = `mailto:hello@businessos.ai?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <main className="app-shell">
      <div className="landing-container py-10 sm:py-14">
        <Link href="/" className="text-sm font-bold text-[var(--teal)]">← الرئيسية</Link>
        <div className="pill pill-teal mt-4 mb-3 w-fit text-xs !py-1.5">تواصل</div>
        <h1 className="page-title mb-2">لنبدأ حديثاً قصيراً</h1>
        <p className="page-sub mb-8 max-w-xl">
          مبيعات، دعم فني، أو شراكة — نرد خلال يوم عمل. يمكنك أيضاً بدء تجربة مباشرة من الصفحة الرئيسية.
        </p>

        <div className="grid-fluid-2 gap-6 items-start">
          <form onSubmit={submit} className="surface-card p-5 sm:p-7 space-y-3">
            {sent && (
              <div className="alert-ok !mb-0">تم فتح تطبيق البريد — أرسل الرسالة لإكمال الطلب.</div>
            )}
            <input
              required
              className="input-field"
              placeholder="الاسم"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              required
              type="email"
              dir="ltr"
              className="input-field"
              placeholder="البريد"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="اسم الشركة (اختياري)"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
            <textarea
              required
              rows={5}
              className="input-field"
              placeholder="كيف نقدر نساعدك؟"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
            <button type="submit" className="btn-orange w-full justify-center">إرسال</button>
          </form>

          <div className="stack-sm">
            <div className="surface-card p-5">
              <p className="font-bold text-[var(--teal-dark)] mb-1">البريد</p>
              <a href="mailto:hello@businessos.ai" className="text-[var(--teal)] font-bold" dir="ltr">
                hello@businessos.ai
              </a>
            </div>
            <div className="surface-card p-5">
              <p className="font-bold text-[var(--teal-dark)] mb-1">الدعم الفني</p>
              <a href="mailto:support@businessos.ai" className="text-[var(--teal)] font-bold" dir="ltr">
                support@businessos.ai
              </a>
            </div>
            <div className="surface-card p-5">
              <p className="font-bold text-[var(--teal-dark)] mb-2">ساعات الرد</p>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                الأحد–الخميس · 9ص–6م (توقيت الرياض)
                <br />
                باقة الإيرادات: أولوية 24/7
              </p>
            </div>
            <Link href="/register" className="btn-teal w-full justify-center">ابدأ تجربة مجانية</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
