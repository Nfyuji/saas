'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  launchWhatsAppEmbeddedSignup,
  listenEmbeddedSignupSession,
  loadFacebookSdk,
  MetaSessionData,
} from '@/lib/meta-sdk';

type MetaConfig = {
  enabled: boolean;
  appId: string;
  configId: string;
  graphVersion: string;
  docsUrl?: string;
};

export default function WhatsAppFacebookConnectPage() {
  const router = useRouter();
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const sessionRef = useRef<MetaSessionData>({});

  useEffect(() => {
    let stopListen: (() => void) | undefined;
    api
      .get<MetaConfig>('/whatsapp/meta/config')
      .then(async (cfg) => {
        setConfig(cfg);
        if (!cfg.enabled || !cfg.appId) return;
        stopListen = listenEmbeddedSignupSession((data) => {
          sessionRef.current = { ...sessionRef.current, ...data };
        });
        await loadFacebookSdk(cfg.appId, cfg.graphVersion || 'v21.0');
        setSdkReady(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'فشل تحميل إعدادات Meta');
      });

    return () => stopListen?.();
  }, []);

  const connectWithFacebook = async () => {
    if (!config?.enabled) {
      setError('لم يُضبط Meta Embedded Signup بعد. أضف META_APP_ID و META_APP_SECRET و META_EMBEDDED_SIGNUP_CONFIG_ID');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('جاري فتح تسجيل دخول فيسبوك...');
    try {
      if (!sdkReady) {
        await loadFacebookSdk(config.appId, config.graphVersion || 'v21.0');
        setSdkReady(true);
      }

      // Reset session before launch
      sessionRef.current = {};
      const code = await launchWhatsAppEmbeddedSignup(config.configId);

      // Wait briefly for WA_EMBEDDED_SIGNUP postMessage (phone + waba)
      const started = Date.now();
      while (
        (!sessionRef.current.phoneNumberId || !sessionRef.current.wabaId) &&
        Date.now() - started < 8000
      ) {
        await new Promise((r) => setTimeout(r, 150));
      }

      const phoneNumberId = sessionRef.current.phoneNumberId;
      const wabaId = sessionRef.current.wabaId;
      if (!phoneNumberId || !wabaId) {
        throw new Error(
          'اكتمل تسجيل الدخول لكن لم تصل بيانات الرقم من فيسبوك. أعد المحاولة أو استخدم الربط اليدوي.',
        );
      }

      setMessage('جاري إكمال الربط على السيرفر...');
      const res = await api.post<{ message?: string }>('/whatsapp/meta/embedded-signup', {
        code,
        phoneNumberId,
        wabaId,
      });
      setMessage(res.message || 'تم الربط بنجاح');
      setTimeout(() => router.push('/dashboard/whatsapp'), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الربط عبر فيسبوك');
      setMessage('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-wrap max-w-lg mx-auto">
      <Link href="/dashboard/whatsapp" className="text-sm font-bold text-[var(--teal)] mb-4 inline-block">
        ← رجوع لإعدادات واتساب
      </Link>

      <div className="fb-connect-card animate-rise">
        <div className="fb-connect-brand">
          <span className="fb-mark" aria-hidden>
            f
          </span>
          <div>
            <p className="fb-kicker">الطريقة الموصى بها</p>
            <h1>تسجيل دخول واتساب عبر فيسبوك</h1>
          </div>
        </div>

        <p className="fb-lead">
          سجّل دخولك بحساب فيسبوك Business، اختر أو أنشئ حساب واتساب للأعمال، ونربط الرقم تلقائياً بـ BusinessOS دون نسخ توكنات يدوياً.
        </p>

        <ul className="fb-bullets">
          <li>تسجيل دخول آمن عبر Facebook Login for Business</li>
          <li>اختيار رقم واتساب Business / Cloud API</li>
          <li>حفظ الربط والاشتراك في Webhooks تلقائياً</li>
        </ul>

        {message && <div className="alert-ok !mb-0">{message}</div>}
        {error && <div className="alert-err !mb-0">{error}</div>}

        {!config ? (
          <p className="text-sm text-[var(--muted)] text-center py-4">جاري تحميل إعدادات الربط...</p>
        ) : config.enabled ? (
          <button
            type="button"
            className="fb-login-btn"
            disabled={busy || !sdkReady}
            onClick={connectWithFacebook}
          >
            <span className="fb-login-icon" aria-hidden>
              f
            </span>
            {busy ? 'جاري الربط...' : sdkReady ? 'متابعة مع فيسبوك' : 'تحميل فيسبوك...'}
          </button>
        ) : (
          <div className="fb-setup-hint">
            <p className="font-bold text-[var(--teal-dark)] mb-2">فعّل Embedded Signup في السيرفر</p>
            <ol>
              <li>أنشئ تطبيق Meta من نوع Business وأضف منتج WhatsApp.</li>
              <li>من Facebook Login for Business أنشئ Configuration لـ Embedded Signup وانسخ Configuration ID.</li>
              <li>
                أضف في <code>backend/.env</code>:
                <pre dir="ltr">{`META_APP_ID=...
META_APP_SECRET=...
META_EMBEDDED_SIGNUP_CONFIG_ID=...`}</pre>
              </li>
              <li>أعد تشغيل الـ API ثم ارجع لهذه الصفحة.</li>
            </ol>
            <a
              href={config.docsUrl || 'https://developers.facebook.com/docs/whatsapp/embedded-signup'}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-sm mt-3 inline-flex"
            >
              وثائق Meta Embedded Signup
            </a>
          </div>
        )}

        <div className="fb-alt">
          <p>أو</p>
          <Link href="/dashboard/whatsapp" className="text-[var(--teal)] font-bold text-sm hover:underline">
            الربط اليدوي برقم Phone Number ID والتوكن
          </Link>
          <span className="sep">·</span>
          <Link href="/dashboard/whatsapp" className="text-[var(--muted)] font-bold text-sm hover:underline">
            وضع تجريبي بدون فيسبوك
          </Link>
        </div>
      </div>
    </div>
  );
}
