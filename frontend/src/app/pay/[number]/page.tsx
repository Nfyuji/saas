'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PayPage() {
  const params = useParams();
  const number = params.number as string;

  return (
    <div className="app-shell flex items-center justify-center p-6">
      <div className="surface-card p-8 max-w-md w-full text-center page-wrap">
        <div className="icon-badge orange mx-auto mb-4 !w-14 !h-14 !text-2xl">🧾</div>
        <h1 className="page-title !text-2xl mb-2">دفع الفاتورة</h1>
        <p className="page-sub mb-6" dir="ltr">{number}</p>
        <p className="text-sm text-[var(--muted)] mb-6">
          صفحة الدفع التجريبية. في الإنتاج تُربط مع Moyasar / Stripe / HyperPay.
        </p>
        <button className="btn-orange w-full justify-center mb-4">▶ ادفع الآن (تجريبي)</button>
        <Link href="/" className="text-sm font-bold text-[var(--teal)]">العودة للرئيسية</Link>
      </div>
    </div>
  );
}
