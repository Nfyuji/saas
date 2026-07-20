'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface WhatsAppStatus {
  configured: boolean;
  demo?: boolean;
  provider?: 'meta' | 'greenapi' | 'demo' | null;
  displayPhoneNumber?: string;
  verifiedName?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  hasAccessToken?: boolean;
  qualityRating?: string;
  codeVerificationStatus?: string;
  aiAutoReply?: boolean;
  welcomeMessage?: string;
  webhookUrl?: string;
  greenWebhookUrl?: string;
  verifyToken?: string;
  apiVersion?: string;
  metaAppSetupUrl?: string;
  metaWhatsAppDocsUrl?: string;
  metaEmbeddedSignup?: {
    enabled: boolean;
    appId: string;
    configId: string;
    loginUrl?: string;
  };
  greenApi?: {
    configured?: boolean;
    apiUrl?: string;
    mediaUrl?: string;
    idInstance?: string;
    hasToken?: boolean;
    docsUrl?: string;
    receiveMode?: string;
  };
}

type Step = 1 | 2 | 3 | 4;

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
    aiAutoReply: true,
    welcomeMessage: 'مرحباً! كيف يمكنني مساعدتك؟',
  });
  const [greenForm, setGreenForm] = useState({
    apiUrl: 'https://7107.api.greenapi.com',
    mediaUrl: 'https://7107.api.greenapi.com',
    idInstance: '',
    apiTokenInstance: '',
    displayPhoneNumber: '',
  });
  const [showToken, setShowToken] = useState(false);
  const [showGreenToken, setShowGreenToken] = useState(false);
  const [simText, setSimText] = useState('مرحباً، أريد معرفة الأسعار');
  const [testTo, setTestTo] = useState('');
  const [testText, setTestText] = useState('رسالة اختبار من BusinessOS AI ✅');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState('');
  const [testOk, setTestOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  const load = () =>
    api
      .get<WhatsAppStatus>('/whatsapp/status')
      .then((data) => {
        setStatus(data);
        setForm((f) => ({
          ...f,
          phoneNumberId: data.demo ? '' : data.phoneNumberId || '',
          businessAccountId: data.demo ? '' : data.businessAccountId || '',
          aiAutoReply: data.aiAutoReply ?? true,
          welcomeMessage: data.welcomeMessage || f.welcomeMessage,
        }));
        setGreenForm((g) => ({
          ...g,
          apiUrl: data.greenApi?.apiUrl || g.apiUrl,
          mediaUrl: data.greenApi?.mediaUrl || g.mediaUrl,
          idInstance: data.greenApi?.idInstance || g.idInstance,
          displayPhoneNumber: data.provider === 'greenapi' ? data.displayPhoneNumber || '' : g.displayPhoneNumber,
        }));
        if (data.configured && !data.demo) setStep(4);
        else if (data.configured && data.demo) setStep(1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const flashCopy = async (key: string, value?: string) => {
    if (!value) return;
    const ok = await copyText(value);
    setCopied(ok ? key : '');
    if (ok) setTimeout(() => setCopied(''), 1800);
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage('');
    setTestOk(false);
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        displayPhoneNumber?: string;
        verifiedName?: string;
        qualityRating?: string;
      }>('/whatsapp/test-connection', {
        phoneNumberId: form.phoneNumberId || undefined,
        accessToken: form.accessToken || undefined,
      });
      setTestOk(true);
      setMessage(
        `${res.message}${res.verifiedName ? ` · ${res.verifiedName}` : ''}${
          res.displayPhoneNumber ? ` · ${res.displayPhoneNumber}` : ''
        }${res.qualityRating ? ` · جودة: ${res.qualityRating}` : ''}`,
      );
      setStep(3);
    } catch (err) {
      setTestOk(false);
      setMessage(err instanceof Error ? err.message : 'فشل الاختبار');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload: Record<string, unknown> = {
        aiAutoReply: form.aiAutoReply,
        welcomeMessage: form.welcomeMessage,
        businessAccountId: form.businessAccountId || undefined,
      };
      if (form.phoneNumberId.trim()) payload.phoneNumberId = form.phoneNumberId.trim();
      if (form.accessToken.trim()) payload.accessToken = form.accessToken.trim();

      const result = await api.put<{ success: boolean; message?: string; whatsapp: WhatsAppStatus }>(
        '/whatsapp/configure',
        payload,
      );
      setStatus(result.whatsapp);
      setMessage(result.message || 'تم حفظ إعدادات واتساب بنجاح');
      setTestOk(true);
      setStep(4);
      setForm((f) => ({ ...f, accessToken: '' }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleGreenTest = async () => {
    setTesting(true);
    setMessage('');
    setTestOk(false);
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        stateInstance?: string;
        displayPhoneNumber?: string;
      }>('/whatsapp/test-greenapi', {
        apiUrl: greenForm.apiUrl || undefined,
        idInstance: greenForm.idInstance || undefined,
        apiTokenInstance: greenForm.apiTokenInstance || undefined,
      });
      setTestOk(true);
      setMessage(
        `${res.message}${res.displayPhoneNumber ? ` · ${res.displayPhoneNumber}` : ''}`,
      );
      if (res.displayPhoneNumber) {
        setGreenForm((g) => ({ ...g, displayPhoneNumber: g.displayPhoneNumber || res.displayPhoneNumber || '' }));
      }
    } catch (err) {
      setTestOk(false);
      setMessage(err instanceof Error ? err.message : 'فشل اختبار Green API');
    } finally {
      setTesting(false);
    }
  };

  const handleGreenSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const result = await api.put<{ success: boolean; message?: string; whatsapp: WhatsAppStatus }>(
        '/whatsapp/configure-greenapi',
        {
          apiUrl: greenForm.apiUrl.trim(),
          mediaUrl: greenForm.mediaUrl.trim() || greenForm.apiUrl.trim(),
          idInstance: greenForm.idInstance.trim(),
          apiTokenInstance: greenForm.apiTokenInstance.trim() || undefined,
          displayPhoneNumber: greenForm.displayPhoneNumber.trim() || undefined,
          aiAutoReply: form.aiAutoReply,
          welcomeMessage: form.welcomeMessage,
        },
      );
      setStatus(result.whatsapp);
      setMessage(result.message || 'تم ربط Green API');
      setTestOk(true);
      setStep(4);
      setGreenForm((g) => ({ ...g, apiTokenInstance: '' }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل ربط Green API');
    } finally {
      setSaving(false);
    }
  };

  const enableDemo = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.post('/whatsapp/demo/enable');
      setMessage('تم تفعيل وضع التجربة');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('فصل ربط Meta؟ يمكنك إعادة الربط لاحقاً أو تفعيل التجربة.')) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await api.post<{ message: string; whatsapp: WhatsAppStatus }>('/whatsapp/disconnect');
      setStatus(res.whatsapp);
      setMessage(res.message);
      setTestOk(false);
      setStep(1);
      setForm((f) => ({ ...f, phoneNumberId: '', accessToken: '', businessAccountId: '' }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الفصل');
    } finally {
      setSaving(false);
    }
  };

  const simulate = async () => {
    setSaving(true);
    try {
      const res = await api.post<{ conversationId: string; aiReply?: string }>('/whatsapp/demo/simulate', {
        text: simText,
        name: 'عميل تجريبي',
      });
      setMessage(res.aiReply ? `رد AI: ${res.aiReply}` : 'تم استلام الرسالة');
      router.push(`/dashboard/inbox?id=${res.conversationId}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل المحاكاة');
    } finally {
      setSaving(false);
    }
  };

  const sendRealTest = async () => {
    if (!testTo.trim()) {
      setMessage('أدخل رقم واتساب للاختبار (مثال 9665...)');
      return;
    }
    setSendingTest(true);
    setMessage('');
    try {
      const res = await api.post<{ conversationId?: string }>('/whatsapp/send-test', {
        to: testTo.trim(),
        text: testText.trim() || undefined,
      });
      setMessage('تم إرسال رسالة الاختبار — تحقق من واتساب على الرقم المستلم');
      if (res.conversationId) {
        setTimeout(() => router.push(`/dashboard/inbox?id=${res.conversationId}`), 800);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل إرسال رسالة الاختبار');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) return <div className="page-wrap empty-state">جاري التحميل...</div>;

  const isError = /فشل|تعذّر|خطأ/i.test(message);
  const isLive = status?.configured && !status.demo;
  const steps: { id: Step; label: string }[] = [
    { id: 1, label: 'Meta' },
    { id: 2, label: 'البيانات' },
    { id: 3, label: 'Webhook' },
    { id: 4, label: 'تشغيل' },
  ];

  return (
    <div className="page-wrap max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title mb-2">ربط واتساب</h1>
          <p className="page-sub">
            اختر Green API أو Meta Cloud API — ثم اختبر الإرسال من الصندوق
          </p>
        </div>
        {isLive && status?.provider === 'greenapi' && (
          <span className="badge badge-ok shrink-0">متصل · Green API</span>
        )}
        {isLive && status?.provider !== 'greenapi' && (
          <span className="badge badge-ok shrink-0">متصل بـ Meta</span>
        )}
        {status?.demo && <span className="badge badge-warn shrink-0">وضع تجريبي</span>}
      </div>

      {message && (
        <div className={`${isError ? 'alert-err' : 'alert-ok'} whitespace-pre-wrap`}>{message}</div>
      )}

      {/* Green API */}
      <section className="surface-card p-5 sm:p-6 space-y-4 border-2 border-[var(--teal)]/30">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-bold text-[var(--orange)] m-0 mb-1">الطريقة الأسرع</p>
            <h2 className="font-display font-extrabold text-xl text-[var(--teal-dark)] m-0">
              ربط عبر Green API
            </h2>
            <p className="text-sm text-[var(--muted)] mt-1 mb-0">
              مثيل جاهز ومرخّص — إرسال واستقبال بدون Meta Embedded Signup
            </p>
          </div>
          {status?.provider === 'greenapi' && status.configured && (
            <span className="badge badge-ok">مفعّل</span>
          )}
        </div>

        <form onSubmit={handleGreenSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">apiUrl</label>
              <input
                dir="ltr"
                className="input-field"
                value={greenForm.apiUrl}
                onChange={(e) => setGreenForm({ ...greenForm, apiUrl: e.target.value })}
                placeholder="https://7107.api.greenapi.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">mediaUrl</label>
              <input
                dir="ltr"
                className="input-field"
                value={greenForm.mediaUrl}
                onChange={(e) => setGreenForm({ ...greenForm, mediaUrl: e.target.value })}
                placeholder="https://7107.api.greenapi.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">idInstance</label>
              <input
                dir="ltr"
                required
                className="input-field"
                value={greenForm.idInstance}
                onChange={(e) => setGreenForm({ ...greenForm, idInstance: e.target.value })}
                placeholder="710701675529"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">apiTokenInstance</label>
              <div className="flex gap-2">
                <input
                  dir="ltr"
                  type={showGreenToken ? 'text' : 'password'}
                  className="input-field flex-1"
                  value={greenForm.apiTokenInstance}
                  onChange={(e) => setGreenForm({ ...greenForm, apiTokenInstance: e.target.value })}
                  placeholder={status?.greenApi?.hasToken ? 'اتركه فارغاً للإبقاء على التوكن' : 'التوكن'}
                />
                <button type="button" className="chip chip-soft" onClick={() => setShowGreenToken((v) => !v)}>
                  {showGreenToken ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold mb-1">رقم الهاتف المرتبط</label>
              <input
                dir="ltr"
                className="input-field"
                value={greenForm.displayPhoneNumber}
                onChange={(e) => setGreenForm({ ...greenForm, displayPhoneNumber: e.target.value })}
                placeholder="967770014732"
              />
            </div>
          </div>

          {status?.greenWebhookUrl && (
            <div className="rounded-2xl bg-[var(--teal-soft)]/40 p-3 text-xs space-y-1">
              <p className="font-bold m-0">Webhook (للإنتاج عبر إنترنت عام)</p>
              <p className="m-0 break-all" dir="ltr">{status.greenWebhookUrl}</p>
              <p className="text-[var(--muted)] m-0">
                محلياً يعمل الاستقبال تلقائياً عبر Polling كل 5 ثوانٍ — لا تحتاج ngrok للاختبار.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={testing} onClick={handleGreenTest} className="btn-ghost">
              {testing ? 'جاري الاختبار...' : 'اختبار الاتصال'}
            </button>
            <button type="submit" disabled={saving} className="btn-teal">
              {saving ? 'جاري الحفظ...' : 'حفظ وربط Green API'}
            </button>
          </div>
        </form>
      </section>

      {/* Primary: Facebook Embedded Signup */}
      {!isLive && (
        <section className="fb-connect-card !max-w-none">
          <div className="fb-connect-brand">
            <span className="fb-mark" aria-hidden>
              f
            </span>
            <div>
              <p className="fb-kicker">أفضل طريقة للربط</p>
              <h2 className="m-0 font-display font-black text-xl text-[var(--teal-dark)]">
                تسجيل دخول واتساب عبر فيسبوك
              </h2>
            </div>
          </div>
          <p className="fb-lead !mb-4">
            بدون نسخ توكنات يدوياً: سجّل دخول فيسبوك Business، اختر رقم واتساب، ونكمل الربط تلقائياً.
          </p>
          <Link href="/dashboard/whatsapp/connect" className="fb-login-btn">
            <span className="fb-login-icon" aria-hidden>
              f
            </span>
            فتح صفحة تسجيل الدخول
          </Link>
          {status?.metaEmbeddedSignup && !status.metaEmbeddedSignup.enabled && (
            <p className="text-xs text-[var(--muted)] mt-3 mb-0">
              بعد ضبط مفاتيح Meta في السيرفر سيُفعّل زر فيسبوك داخل صفحة التسجيل.
            </p>
          )}
        </section>
      )}

      {/* Connection summary */}
      {status?.configured && (
        <div className="surface-card p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
              <p className="font-semibold text-[var(--teal-dark)]">
                {status.demo
                  ? 'وضع تجريبي مفعّل'
                  : status.provider === 'greenapi'
                    ? 'واتساب عبر Green API'
                    : 'واتساب الحقيقي مفعّل (Meta)'}
              </p>
              <p className="text-sm text-[var(--muted)] mt-1">
                {status.verifiedName || '—'}
                {status.displayPhoneNumber && (
                  <>
                    {' · '}
                    <span dir="ltr">{status.displayPhoneNumber}</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!status.demo && (
                <button type="button" onClick={() => setStep(2)} className="btn-ghost text-sm !py-2">
                  تحديث الربط
                </button>
              )}
              {!status.demo && (
                <button type="button" onClick={disconnect} disabled={saving} className="btn-ghost text-sm !py-2 text-[var(--orange)]">
                  فصل الربط
                </button>
              )}
            </div>
          </div>
          {!status.demo && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl bg-[var(--teal-soft)]/40 px-3 py-2">
                <p className="text-xs text-[var(--muted)] font-bold">جودة الرقم</p>
                <p className="font-bold">{status.qualityRating || '—'}</p>
              </div>
              <div className="rounded-2xl bg-[var(--teal-soft)]/40 px-3 py-2">
                <p className="text-xs text-[var(--muted)] font-bold">حالة التحقق</p>
                <p className="font-bold break-all">{status.codeVerificationStatus || '—'}</p>
              </div>
              <div className="rounded-2xl bg-[var(--teal-soft)]/40 px-3 py-2">
                <p className="text-xs text-[var(--muted)] font-bold">API</p>
                <p className="font-bold" dir="ltr">{status.apiVersion || 'v21.0'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {status?.configured && (
        <section className="surface-card p-5 sm:p-6 space-y-3">
          <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0">
            إرسال رسالة اختبار حقيقية
          </h2>
          <p className="text-sm text-[var(--muted)] m-0">
            أرسل لنفسك أو لرقم تجريبي. الرقم يُحفظ تلقائياً في العملاء عند أول تواصل.
            {status.demo ? ' (في وضع Demo تُسجَّل الرسالة محلياً دون Meta)' : ''}
          </p>
          <input
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            className="input-field"
            dir="ltr"
            placeholder="9665xxxxxxxx"
          />
          <input
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="input-field"
            placeholder="نص رسالة الاختبار"
          />
          <button
            type="button"
            onClick={sendRealTest}
            disabled={sendingTest}
            className="btn-orange disabled:opacity-50"
          >
            {sendingTest ? 'جاري الإرسال...' : 'إرسال رسالة اختبار'}
          </button>
        </section>
      )}

      {/* Wizard steps */}
      <div className="meta-steps" role="list" aria-label="خطوات الربط">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            role="listitem"
            className={`meta-step ${step === s.id ? 'is-active' : ''} ${step > s.id || (isLive && s.id === 4) ? 'is-done' : ''}`}
            onClick={() => setStep(s.id)}
          >
            <span className="meta-step-num">{s.id}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Step 1 — Meta guide */}
      {step === 1 && (
        <section className="surface-card p-5 sm:p-6 space-y-4">
          <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)]">1) جهّز تطبيق Meta</h2>
          <ol className="meta-guide">
            <li>
              افتح{' '}
              <a href={status?.metaAppSetupUrl || 'https://developers.facebook.com/apps/'} target="_blank" rel="noreferrer">
                Meta for Developers
              </a>{' '}
              وأنشئ تطبيقاً من نوع Business.
            </li>
            <li>أضف منتج <strong>WhatsApp</strong> ثم ادخل إلى WhatsApp → API Setup.</li>
            <li>
              انسخ <strong>Phone number ID</strong> و <strong>Temporary / Permanent access token</strong> و (اختياري){' '}
              <strong>WhatsApp Business Account ID</strong>.
            </li>
            <li>
              للإنتاج استخدم System User Token دائم من Business Manager بصلاحيات{' '}
              <span dir="ltr">whatsapp_business_messaging</span> و{' '}
              <span dir="ltr">whatsapp_business_management</span>.
            </li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <a
              href={status?.metaWhatsAppDocsUrl || 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started'}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-sm"
            >
              وثائق Cloud API
            </a>
            <button type="button" className="btn-orange text-sm" onClick={() => setStep(2)}>
              لديّ البيانات — التالي
            </button>
          </div>
        </section>
      )}

      {/* Step 2 — Credentials */}
      {step === 2 && (
        <section className="surface-card p-5 sm:p-6 space-y-4">
          <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)]">2) بيانات الربط</h2>
          <p className="text-sm text-[var(--muted)]">
            الصق القيم من لوحة Meta. اختبر الاتصال قبل الحفظ — لن نُكمل الربط إذا رفض Graph API التوكن.
          </p>

          <div className="space-y-3">
            <label className="block text-sm font-bold">
              Phone Number ID
              <input
                value={form.phoneNumberId}
                onChange={(e) => {
                  setForm({ ...form, phoneNumberId: e.target.value });
                  setTestOk(false);
                }}
                className="input-field mt-1.5"
                placeholder="مثال: 109876543210987"
                dir="ltr"
                autoComplete="off"
              />
            </label>

            <label className="block text-sm font-bold">
              Access Token
              <div className="flex gap-2 mt-1.5">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.accessToken}
                  onChange={(e) => {
                    setForm({ ...form, accessToken: e.target.value });
                    setTestOk(false);
                  }}
                  className="input-field flex-1"
                  placeholder={status?.hasAccessToken && !status.demo ? 'اتركه فارغاً للإبقاء على التوكن الحالي' : 'EAAG...'}
                  dir="ltr"
                  autoComplete="off"
                />
                <button type="button" className="btn-ghost shrink-0 !px-3" onClick={() => setShowToken((v) => !v)}>
                  {showToken ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
            </label>

            <label className="block text-sm font-bold">
              WhatsApp Business Account ID <span className="text-[var(--muted)] font-medium">(اختياري للقوالب)</span>
              <input
                value={form.businessAccountId}
                onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
                className="input-field mt-1.5"
                placeholder="WABA ID"
                dir="ltr"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
              رجوع
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || (!form.phoneNumberId && !status?.hasAccessToken)}
              className="btn-teal disabled:opacity-50"
            >
              {testing ? 'جاري الاختبار...' : 'اختبار الاتصال بـ Meta'}
            </button>
            {testOk && (
              <button type="button" className="btn-orange" onClick={() => setStep(3)}>
                التالي — Webhook
              </button>
            )}
          </div>
        </section>
      )}

      {/* Step 3 — Webhook */}
      {step === 3 && (
        <section className="surface-card p-5 sm:p-6 space-y-4">
          <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)]">3) إعداد Webhook في Meta</h2>
          <p className="text-sm text-[var(--muted)]">
            من WhatsApp → Configuration الصق العنوان والرمز التاليين، ثم اشترك في أحداث{' '}
            <span dir="ltr">messages</span> و <span dir="ltr">message_status</span>.
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-sm font-bold">Callback URL</p>
                <button type="button" className="text-xs font-bold text-[var(--teal)]" onClick={() => flashCopy('url', status?.webhookUrl)}>
                  {copied === 'url' ? 'تم النسخ ✓' : 'نسخ'}
                </button>
              </div>
              <div className="meta-code" dir="ltr">
                {status?.webhookUrl}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-sm font-bold">Verify Token</p>
                <button type="button" className="text-xs font-bold text-[var(--teal)]" onClick={() => flashCopy('token', status?.verifyToken)}>
                  {copied === 'token' ? 'تم النسخ ✓' : 'نسخ'}
                </button>
              </div>
              <div className="meta-code" dir="ltr">
                {status?.verifyToken}
              </div>
              <p className="text-xs text-[var(--muted)] mt-2">
                يجب أن يطابق <span dir="ltr">WHATSAPP_VERIFY_TOKEN</span> في ملف بيئة السيرفر.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--orange-soft)]/40 px-4 py-3 text-sm text-[var(--orange-dark)] font-medium">
            على الاستضافة المحلية: Meta لا يصل إلى localhost مباشرة. استخدم نفقاً عاماً (مثل ngrok) ووجّه Callback URL إلى عنوان النفق +{' '}
            <span dir="ltr">/api/webhooks/whatsapp</span>.
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
              رجوع
            </button>
            <button type="button" className="btn-orange" onClick={() => setStep(4)}>
              تم إعداد Webhook — حفظ الربط
            </button>
          </div>
        </section>
      )}

      {/* Step 4 — Save + AI settings */}
      {step === 4 && (
        <form onSubmit={handleSave} className="surface-card p-5 sm:p-6 space-y-4">
          <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)]">4) احفظ الربط وإعدادات الرد</h2>
          <p className="text-sm text-[var(--muted)]">
            بعد الحفظ الناجح تظهر الرسائل الواردة في{' '}
            <button type="button" className="text-[var(--teal)] font-bold" onClick={() => router.push('/dashboard/inbox')}>
              صندوق الرسائل
            </button>
            .
          </p>

          <label className="block text-sm font-bold">
            حملة ترحيب (تُرسل تلقائياً لأول رقم جديد)
            <textarea
              value={form.welcomeMessage}
              onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
              className="input-field mt-1.5"
              rows={2}
              placeholder="مرحباً بك! كيف نقدر نساعدك اليوم؟"
            />
          </label>

          <label className="flex items-center gap-3 text-sm font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={form.aiAutoReply}
              onChange={(e) => setForm({ ...form, aiAutoReply: e.target.checked })}
              className="size-4 accent-[var(--teal)]"
            />
            رد AI تلقائي على الرسائل الواردة
          </label>

          {!form.phoneNumberId && !status?.hasAccessToken && (
            <p className="text-sm text-[var(--orange-dark)] font-medium">ارجع للخطوة 2 وأدخل بيانات Meta أولاً.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => setStep(3)}>
              رجوع
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="btn-ghost disabled:opacity-50"
            >
              {testing ? '...' : 'إعادة اختبار Meta'}
            </button>
            <button type="submit" disabled={saving} className="btn-teal disabled:opacity-50">
              {saving ? 'جاري الحفظ...' : isLive ? 'تحديث الإعدادات' : 'حفظ ربط Meta'}
            </button>
          </div>
        </form>
      )}

      {/* Demo sandbox — secondary */}
      <details className="surface-card p-5 sm:p-6 group">
        <summary className="font-bold cursor-pointer list-none flex items-center justify-between gap-2">
          <span>تجربة بدون Meta (وضع تجريبي)</span>
          <span className="text-[var(--muted)] text-sm font-medium group-open:hidden">فتح</span>
          <span className="text-[var(--muted)] text-sm font-medium hidden group-open:inline">إخفاء</span>
        </summary>
        <div className="mt-4 space-y-3">
          <p className="text-sm text-[var(--muted)]">
            للاختبار الداخلي: فعّل الديمو ثم أرسل رسالة وهمية لترى AI والصفقة والمتابعة دون ربط رقم حقيقي.
          </p>
          <button type="button" onClick={enableDemo} disabled={saving} className="btn-orange disabled:opacity-50">
            تفعيل واتساب التجريبي
          </button>
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
              className="input-field flex-1"
              placeholder="رسالة العميل التجريبية"
            />
            <button type="button" onClick={simulate} disabled={saving} className="btn-teal disabled:opacity-50 shrink-0">
              محاكاة رسالة
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
