import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="app-shell">
      <div className="max-w-3xl mx-auto px-6 py-14 page-wrap">
        <Link href="/" className="text-sm font-bold text-[var(--teal)]">← الرئيسية</Link>
        <div className="pill pill-teal mt-4 mb-3 w-fit text-xs !py-1.5">Privacy</div>
        <h1 className="page-title mb-4">سياسة الخصوصية</h1>
        <div className="surface-card p-6 space-y-4 text-[var(--muted)] leading-relaxed">
          <p>نحترم خصوصية بيانات الشركات والعملاء ونعالجها لتشغيل الخدمة فقط.</p>
          <ul className="list-disc pr-5 space-y-2">
            <li>نخزّن حسابات الشركات والرسائل والمحادثات لتقديم CRM وواتساب AI.</li>
            <li>لا نبيع بياناتك لأطراف خارجية.</li>
            <li>عند ربط OpenAI تُرسل مقتطفات محادثة ضرورية لتوليد الردود.</li>
            <li>يمكنك طلب حذف حساب شركتك بالتواصل مع الدعم.</li>
          </ul>
          <p className="text-sm">آخر تحديث: يوليو 2026</p>
        </div>
      </div>
    </main>
  );
}
