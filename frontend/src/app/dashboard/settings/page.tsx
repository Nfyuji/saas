'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader, QuickLink } from '@/components/ui';

export default function SettingsPage() {
  const { user, company, refreshProfile } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', industry: '' });
  const [aiInstructions, setAiInstructions] = useState('');
  const [ops, setOps] = useState({
    autoFollowUp: true,
    postPurchaseFollowUp: true,
    salesAgentEnabled: true,
  });
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<{
        name: string;
        phone?: string;
        industry?: string;
        settings?: {
          aiInstructions?: string;
          autoFollowUp?: boolean;
          postPurchaseFollowUp?: boolean;
          salesAgentEnabled?: boolean;
        };
      }>('/companies/me')
      .then((data) => {
        setForm({ name: data.name || '', phone: data.phone || '', industry: data.industry || '' });
        setAiInstructions(data.settings?.aiInstructions || '');
        setOps({
          autoFollowUp: data.settings?.autoFollowUp !== false,
          postPurchaseFollowUp: data.settings?.postPurchaseFollowUp !== false,
          salesAgentEnabled: data.settings?.salesAgentEnabled !== false,
        });
      })
      .catch(console.error);
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.put('/companies/me', form);
      await refreshProfile();
      setMessage('تم حفظ بيانات الشركة');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const saveAi = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.put('/companies/me/settings', {
        aiInstructions,
        aiEnabled: true,
        language: 'ar',
        ...ops,
        postPurchaseHours: [24, 72],
        followUpHours: [2, 24, 72],
      });
      setMessage('تم حفظ تعليمات الذكاء الاصطناعي والمتابعات');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (password.next !== password.confirm) {
      setMessage('تأكيد كلمة المرور غير متطابق');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put<{ message: string }>('/auth/change-password', {
        currentPassword: password.current,
        newPassword: password.next,
      });
      setMessage(res.message || 'تم تحديث كلمة المرور');
      setPassword({ current: '', next: '', confirm: '' });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل تحديث كلمة المرور');
    } finally {
      setSaving(false);
    }
  };

  const isError = /فشل|غير|خطأ/i.test(message);

  return (
    <div className="page-wrap max-w-3xl space-y-6">
      <PageHeader
        title="إعدادات التشغيل"
        subtitle="هوية الشركة، صوت AI، الأمان، واختصارات الإطلاق"
        eyebrow="Settings"
        actions={
          <>
            <Link href="/dashboard/profile" className="btn-ghost text-sm">
              الملف الشخصي
            </Link>
            <Link href="/dashboard/usage" className="btn-ghost text-sm">
              الاستخدام
            </Link>
            <Link href="/dashboard/billing" className="btn-ghost text-sm">
              الباقة: {company?.plan || '—'}
            </Link>
          </>
        }
      />

      {message && <div className={isError ? 'alert-err' : 'alert-ok'}>{message}</div>}

      <div className="quick-grid !mb-0">
        <QuickLink href="/dashboard/whatsapp" title="واتساب / Meta" desc="الربط والويب هوك" />
        <QuickLink href="/dashboard/billing" title="الاشتراك" desc="الباقات والدفع" tone="orange" />
        <QuickLink href="/dashboard/team" title="الفريق" desc="دعوات والهوية" />
        <QuickLink href="/dashboard/knowledge" title="المعرفة" desc="علّم المندوب" tone="sky" />
      </div>

      <form onSubmit={saveProfile} className="surface-card p-5 sm:p-6 space-y-4">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)]">بيانات الشركة</h2>
        <label className="block text-sm font-bold">
          اسم الشركة
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field mt-1.5"
            required
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm font-bold">
            هاتف الشركة
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field mt-1.5"
              dir="ltr"
            />
          </label>
          <label className="block text-sm font-bold">
            المجال
            <input
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="input-field mt-1.5"
              placeholder="تجارة، خدمات، عقارات..."
            />
          </label>
        </div>
        <p className="text-xs text-[var(--muted)]">
          الحساب: <strong>{user?.name}</strong> · <span dir="ltr">{user?.email}</span>
        </p>
        <button type="submit" disabled={saving} className="btn-teal disabled:opacity-50">
          حفظ بيانات الشركة
        </button>
      </form>

      <div className="surface-card p-5 sm:p-6 space-y-4">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)]">صوت المندوب الذكي</h2>
        <p className="text-sm text-[var(--muted)] m-0">
          عرّف كيف يرد AI على واتساب: النبرة، العروض، وما لا يجب قوله. يُفضّل ربطها بقاعدة المعرفة.
        </p>
        <textarea
          value={aiInstructions}
          onChange={(e) => setAiInstructions(e.target.value)}
          rows={6}
          className="input-field"
          placeholder="مثال: نحن متجر إلكترونيات. نرد بلطف باللهجة البيضاء، نذكر الأسعار من الكتالوج فقط، ونحوّل المهتم لفاتورة..."
        />
        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-3 text-sm font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={ops.salesAgentEnabled}
              onChange={(e) => setOps({ ...ops, salesAgentEnabled: e.target.checked })}
              className="size-4 accent-[var(--teal)]"
            />
            وضع مندوب المبيعات الذكي
          </label>
          <label className="flex items-center gap-3 text-sm font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={ops.autoFollowUp}
              onChange={(e) => setOps({ ...ops, autoFollowUp: e.target.checked })}
              className="size-4 accent-[var(--teal)]"
            />
            متابعة من لم يرد (2س / 24س / 72س)
          </label>
          <label className="flex items-center gap-3 text-sm font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={ops.postPurchaseFollowUp}
              onChange={(e) => setOps({ ...ops, postPurchaseFollowUp: e.target.checked })}
              className="size-4 accent-[var(--teal)]"
            />
            بعد الشراء: اسأل «هل المنتج/الجهاز حلو؟» (24س و 72س)
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveAi} disabled={saving} className="btn-orange disabled:opacity-50">
            حفظ تعليمات AI والمتابعات
          </button>
          <Link href="/dashboard/knowledge" className="btn-ghost text-sm">
            إدارة المعرفة
          </Link>
          <Link href="/dashboard/campaigns" className="btn-ghost text-sm">
            الحملات
          </Link>
        </div>
      </div>

      <form onSubmit={changePassword} className="surface-card p-5 sm:p-6 space-y-4">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)]">الأمان — تغيير كلمة المرور</h2>
        <label className="block text-sm font-bold">
          كلمة المرور الحالية
          <input
            type="password"
            required
            minLength={6}
            value={password.current}
            onChange={(e) => setPassword({ ...password, current: e.target.value })}
            className="input-field mt-1.5"
            dir="ltr"
            autoComplete="current-password"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm font-bold">
            الجديدة
            <input
              type="password"
              required
              minLength={6}
              value={password.next}
              onChange={(e) => setPassword({ ...password, next: e.target.value })}
              className="input-field mt-1.5"
              dir="ltr"
              autoComplete="new-password"
            />
          </label>
          <label className="block text-sm font-bold">
            تأكيد الجديدة
            <input
              type="password"
              required
              minLength={6}
              value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              className="input-field mt-1.5"
              dir="ltr"
              autoComplete="new-password"
            />
          </label>
        </div>
        <button type="submit" disabled={saving} className="btn-teal disabled:opacity-50">
          تحديث كلمة المرور
        </button>
      </form>
    </div>
  );
}
