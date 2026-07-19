import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="app-shell">
      <div className="max-w-3xl mx-auto px-6 py-14 page-wrap">
        <Link href="/" className="text-sm font-bold text-[var(--teal)]">← الرئيسية</Link>
        <div className="pill pill-teal mt-4 mb-3 w-fit text-xs !py-1.5">Legal</div>
        <h1 className="page-title mb-4">الشروط والأحكام</h1>
        <div className="surface-card p-6 space-y-4 text-[var(--muted)] leading-relaxed">
          <p>باستخدامك لمنصة BusinessOS AI فإنك توافق على استخدام الخدمة لإدارة تواصل شركتك عبر واتساب والذكاء الاصطناعي.</p>
          <ul className="list-disc pr-5 space-y-2">
            <li>أنت مسؤول عن بيانات شركتك وعملائك وصلاحية ربط واتساب.</li>
            <li>الباقات التجريبية قد تُحدّث أو تُوقف حسب سياسة الخدمة.</li>
            <li>يُمنع استخدام المنصة لإرسال رسائل مزعجة أو مخالفة لأنظمة Meta.</li>
          </ul>
          <p className="text-sm">آخر تحديث: يوليو 2026</p>
        </div>
      </div>
    </main>
  );
}
