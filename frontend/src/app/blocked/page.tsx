'use client';

export default function BlockedPage() {
  return (
    <div className="app-shell flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md surface-card p-6 sm:p-8 text-center space-y-4">
        <div className="text-4xl" aria-hidden>
          ⛔
        </div>
        <h1 className="font-display text-2xl font-black text-[var(--orange-dark)] m-0">
          تم حظر هذا الجهاز
        </h1>
        <p className="text-sm text-[var(--muted)] m-0 leading-7">
          تم منع هذا الجهاز نهائياً من الوصول إلى المنصة بقرار من إدارة النظام. تغيير VPN أو الشبكة لن
          يزيل الحظر لأن المنع يعتمد على بصمة الجهاز وليس عنوان IP فقط.
        </p>
        <p className="text-xs text-[var(--muted)] m-0">
          إن كنت تعتقد أن هذا خطأ، تواصل مع دعم المنصة من جهاز آخر.
        </p>
      </div>
    </div>
  );
}
