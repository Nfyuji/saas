'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Settings {
  platformName: string;
  supportMessage?: string;
  supportEmail?: string;
  allowRegistration: boolean;
  trialEnabled: boolean;
  trialDays: number;
  defaultPlanCode: string;
  maintenanceMode: boolean;
}

interface PlanOption {
  code: string;
  name: string;
}

interface ProviderUsage {
  configured: boolean;
  maskedKey: string;
  model: string;
  monthlyBudget: number;
  usedTokens: number;
  remainingTokens: number | null;
  usedPercent: number | null;
  requestsMonth: number;
  status: 'missing' | 'ok' | 'low' | 'exhausted';
}

interface AiStatus {
  enabled: boolean;
  preferredProvider: string;
  activeProvider: string | null;
  monthKey: string;
  openai: ProviderUsage;
  gemini: ProviderUsage;
  series7d: Array<{ day: string; provider: string; tokens: number; requests: number }>;
}

const statusLabel: Record<string, string> = {
  missing: 'غير مربوط',
  ok: 'جيّد',
  low: 'قارب النفاد',
  exhausted: 'نفد',
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [health, setHealth] = useState<{ status: string; checks?: { api: boolean; mongodb: boolean } } | null>(null);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [aiForm, setAiForm] = useState({
    aiProvider: 'auto',
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.0-flash',
    openaiMonthlyTokenBudget: 1000000,
    geminiMonthlyTokenBudget: 1000000,
    aiEnabled: true,
  });
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const loadAi = () =>
    api.get<AiStatus>('/platform-admin/ai-keys').then((data) => {
      setAi(data);
      setAiForm((f) => ({
        ...f,
        aiProvider: data.preferredProvider || 'auto',
        openaiModel: data.openai.model || f.openaiModel,
        geminiModel: data.gemini.model || f.geminiModel,
        openaiMonthlyTokenBudget: data.openai.monthlyBudget ?? f.openaiMonthlyTokenBudget,
        geminiMonthlyTokenBudget: data.gemini.monthlyBudget ?? f.geminiMonthlyTokenBudget,
        aiEnabled: data.enabled,
        openaiApiKey: '',
        geminiApiKey: '',
      }));
    });

  useEffect(() => {
    api.get<Settings>('/platform-admin/settings').then(setForm).catch(console.error);
    api
      .get<PlanOption[]>('/platform-admin/plans')
      .then((p) => setPlans(p.map((x) => ({ code: x.code, name: x.name }))))
      .catch(console.error);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'down' }));
    loadAi().catch(console.error);
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setError('');
    try {
      await api.put('/platform-admin/settings', form);
      setMessage('تم حفظ إعدادات المنصة');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  };

  const saveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('save');
    setError('');
    setMessage('');
    try {
      const payload: Record<string, unknown> = {
        aiProvider: aiForm.aiProvider,
        openaiModel: aiForm.openaiModel,
        geminiModel: aiForm.geminiModel,
        openaiMonthlyTokenBudget: Number(aiForm.openaiMonthlyTokenBudget) || 0,
        geminiMonthlyTokenBudget: Number(aiForm.geminiMonthlyTokenBudget) || 0,
        aiEnabled: aiForm.aiEnabled,
      };
      if (aiForm.openaiApiKey.trim() && !aiForm.openaiApiKey.includes('•')) {
        payload.openaiApiKey = aiForm.openaiApiKey.trim();
      }
      if (aiForm.geminiApiKey.trim() && !aiForm.geminiApiKey.includes('•')) {
        payload.geminiApiKey = aiForm.geminiApiKey.trim();
      }
      const data = await api.put<AiStatus>('/platform-admin/ai-keys', payload);
      setAi(data);
      setAiForm((f) => ({ ...f, openaiApiKey: '', geminiApiKey: '' }));
      setMessage('تم حفظ مفاتيح الذكاء الاصطناعي والميزانيات');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ مفاتيح AI');
    } finally {
      setBusy('');
    }
  };

  const testKey = async (provider: 'openai' | 'gemini') => {
    setBusy(`test-${provider}`);
    setError('');
    setMessage('');
    try {
      const res = await api.post<{ success: boolean; reply?: string; model?: string }>(
        '/platform-admin/ai-keys/test',
        { provider },
      );
      setMessage(`اختبار ${provider} نجح · ${res.model} · الرد: ${res.reply || 'ok'}`);
      await loadAi();
    } catch (err) {
      setError(err instanceof Error ? err.message : `فشل اختبار ${provider}`);
    } finally {
      setBusy('');
    }
  };

  const resetUsage = async () => {
    if (!confirm('تصفير عداد الاستهلاك لهذا الشهر؟')) return;
    setBusy('reset');
    try {
      const data = await api.put<AiStatus>('/platform-admin/ai-keys', { resetUsage: true });
      setAi(data);
      setMessage('تم تصفير عداد الاستهلاك الشهري');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التصفير');
    } finally {
      setBusy('');
    }
  };

  const clearKey = async (provider: 'openai' | 'gemini') => {
    if (!confirm(`حذف مفتاح ${provider}؟`)) return;
    setBusy(`clear-${provider}`);
    try {
      const payload =
        provider === 'openai' ? { openaiApiKey: '__clear__' } : { geminiApiKey: '__clear__' };
      const data = await api.put<AiStatus>('/platform-admin/ai-keys', payload);
      setAi(data);
      setMessage(`تم حذف مفتاح ${provider}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
    } finally {
      setBusy('');
    }
  };

  if (!form) return <div className="page-wrap animate-pulse text-[var(--muted)]">جاري التحميل...</div>;

  const meter = (p: ProviderUsage, label: string) => (
    <div className="rounded-2xl border border-[var(--border)] p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold m-0">{label}</p>
        <span
          className={`badge ${
            p.status === 'ok' ? 'badge-ok' : p.status === 'missing' ? 'badge-warn' : 'badge-warn'
          }`}
        >
          {statusLabel[p.status] || p.status}
        </span>
      </div>
      <p className="text-xs text-[var(--muted)] m-0" dir="ltr">
        {p.configured ? p.maskedKey || '••••' : 'لا مفتاح'}
      </p>
      <p className="text-sm m-0">
        مستخدم: <strong>{p.usedTokens.toLocaleString('ar')}</strong>
        {p.remainingTokens != null && (
          <>
            {' '}
            · متبقي: <strong className="text-[var(--teal-dark)]">{p.remainingTokens.toLocaleString('ar')}</strong>
          </>
        )}
      </p>
      <p className="text-xs text-[var(--muted)] m-0">
        الميزانية: {p.monthlyBudget > 0 ? p.monthlyBudget.toLocaleString('ar') : 'بلا حد'} توكن · طلبات:{' '}
        {p.requestsMonth}
      </p>
      {p.usedPercent != null && (
        <div className="usage-chip-bar" aria-hidden>
          <span
            className={`usage-chip-fill ${
              p.usedPercent >= 90 ? 'is-danger' : p.usedPercent >= 70 ? 'is-warn' : ''
            }`}
            style={{ width: `${p.usedPercent}%` }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="page-wrap max-w-3xl space-y-6">
      <div>
        <h1 className="page-title">إعدادات المنصة</h1>
        <p className="page-sub">تحكم كامل بإعدادات التسجيل والتجربة والصيانة ومفاتيح الذكاء الاصطناعي</p>
      </div>

      {message && <div className="alert-ok">{message}</div>}
      {error && <div className="alert-err">{error}</div>}

      <div className="surface-card p-6">
        <h2 className="font-display font-extrabold text-lg mb-4 text-[var(--teal-dark)]">صحة النظام</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[var(--teal-soft)]/30">
            <p className="text-xs text-[var(--muted)] mb-1">API</p>
            <span className={`badge ${health?.status === 'ok' ? 'badge-ok' : 'badge-warn'}`}>
              {health?.status === 'ok' ? 'يعمل' : 'متوقف'}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[var(--teal-soft)]/30">
            <p className="text-xs text-[var(--muted)] mb-1">MongoDB</p>
            <span className={`badge ${health?.checks?.mongodb ? 'badge-ok' : 'badge-warn'}`}>
              {health?.checks?.mongodb ? 'متصل' : 'غير متصل'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Keys */}
      <form onSubmit={saveAi} className="surface-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0">
              مفاتيح الذكاء الاصطناعي
            </h2>
            <p className="text-sm text-[var(--muted)] m-0 mt-1">
              GPT (OpenAI) و Gemini — مع قياس الاستهلاك الشهري والمتبقي
              {ai?.monthKey ? ` · شهر ${ai.monthKey}` : ''}
            </p>
          </div>
          {ai?.activeProvider && (
            <span className="badge badge-ok">نشط: {ai.activeProvider}</span>
          )}
        </div>

        {ai && (
          <div className="grid sm:grid-cols-2 gap-3">
            {meter(ai.openai, 'OpenAI / GPT')}
            {meter(ai.gemini, 'Google Gemini')}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={aiForm.aiEnabled}
            onChange={(e) => setAiForm({ ...aiForm, aiEnabled: e.target.checked })}
          />
          تفعيل الذكاء الاصطناعي للمنصة
        </label>

        <label className="block text-sm">
          المزوّد المفضّل
          <select
            className="input-field mt-1"
            value={aiForm.aiProvider}
            onChange={(e) => setAiForm({ ...aiForm, aiProvider: e.target.value })}
          >
            <option value="auto">تلقائي (OpenAI ثم Gemini)</option>
            <option value="openai">OpenAI / GPT فقط</option>
            <option value="gemini">Gemini فقط</option>
          </select>
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-sm font-bold">مفتاح OpenAI</label>
            <div className="flex gap-2">
              <input
                dir="ltr"
                type={showOpenAi ? 'text' : 'password'}
                className="input-field flex-1"
                value={aiForm.openaiApiKey}
                onChange={(e) => setAiForm({ ...aiForm, openaiApiKey: e.target.value })}
                placeholder={ai?.openai.configured ? 'اتركه فارغاً للإبقاء' : 'sk-...'}
              />
              <button type="button" className="chip chip-soft" onClick={() => setShowOpenAi((v) => !v)}>
                {showOpenAi ? 'إخفاء' : 'إظهار'}
              </button>
            </div>
            <input
              dir="ltr"
              className="input-field"
              value={aiForm.openaiModel}
              onChange={(e) => setAiForm({ ...aiForm, openaiModel: e.target.value })}
              placeholder="gpt-4o-mini"
            />
            <label className="block text-xs text-[var(--muted)]">
              ميزانية التوكنات / شهر
              <input
                type="number"
                min={0}
                className="input-field mt-1"
                value={aiForm.openaiMonthlyTokenBudget}
                onChange={(e) =>
                  setAiForm({ ...aiForm, openaiMonthlyTokenBudget: Number(e.target.value) })
                }
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="chip chip-soft text-sm"
                disabled={!!busy}
                onClick={() => testKey('openai')}
              >
                {busy === 'test-openai' ? '...' : 'اختبار GPT'}
              </button>
              {ai?.openai.configured && (
                <button
                  type="button"
                  className="chip chip-orange text-sm"
                  disabled={!!busy}
                  onClick={() => clearKey('openai')}
                >
                  حذف المفتاح
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold">مفتاح Gemini</label>
            <div className="flex gap-2">
              <input
                dir="ltr"
                type={showGemini ? 'text' : 'password'}
                className="input-field flex-1"
                value={aiForm.geminiApiKey}
                onChange={(e) => setAiForm({ ...aiForm, geminiApiKey: e.target.value })}
                placeholder={ai?.gemini.configured ? 'اتركه فارغاً للإبقاء' : 'AIza...'}
              />
              <button type="button" className="chip chip-soft" onClick={() => setShowGemini((v) => !v)}>
                {showGemini ? 'إخفاء' : 'إظهار'}
              </button>
            </div>
            <input
              dir="ltr"
              className="input-field"
              value={aiForm.geminiModel}
              onChange={(e) => setAiForm({ ...aiForm, geminiModel: e.target.value })}
              placeholder="gemini-2.0-flash"
            />
            <label className="block text-xs text-[var(--muted)]">
              ميزانية التوكنات / شهر
              <input
                type="number"
                min={0}
                className="input-field mt-1"
                value={aiForm.geminiMonthlyTokenBudget}
                onChange={(e) =>
                  setAiForm({ ...aiForm, geminiMonthlyTokenBudget: Number(e.target.value) })
                }
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="chip chip-soft text-sm"
                disabled={!!busy}
                onClick={() => testKey('gemini')}
              >
                {busy === 'test-gemini' ? '...' : 'اختبار Gemini'}
              </button>
              {ai?.gemini.configured && (
                <button
                  type="button"
                  className="chip chip-orange text-sm"
                  disabled={!!busy}
                  onClick={() => clearKey('gemini')}
                >
                  حذف المفتاح
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={!!busy} className="btn-teal">
            {busy === 'save' ? 'جاري الحفظ...' : 'حفظ مفاتيح AI'}
          </button>
          <button type="button" disabled={!!busy} className="btn-ghost" onClick={resetUsage}>
            تصفير عداد الشهر
          </button>
        </div>
        <p className="text-xs text-[var(--muted)] m-0">
          الميزانية 0 = بلا حد. عند النفاد يتوقف الـ AI تلقائياً حتى تزيد الميزانية أو تصفّر العداد.
          المفاتيح تُخزَّن في قاعدة البيانات (مع دعم `.env` كاحتياطي).
        </p>
      </form>

      <form onSubmit={save} className="surface-card p-6 space-y-4">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0">إعدادات عامة</h2>
        <input
          value={form.platformName}
          onChange={(e) => setForm({ ...form, platformName: e.target.value })}
          className="input-field"
          placeholder="اسم المنصة"
        />
        <input
          value={form.supportEmail || ''}
          onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
          className="input-field"
          placeholder="إيميل الدعم"
          dir="ltr"
        />
        <textarea
          value={form.supportMessage || ''}
          onChange={(e) => setForm({ ...form, supportMessage: e.target.value })}
          className="input-field"
          rows={3}
          placeholder="رسالة الدعم / الترحيب"
        />

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">
            أيام التجربة
            <input
              type="number"
              value={form.trialDays}
              onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })}
              className="input-field mt-1"
            />
          </label>
          <label className="text-sm">
            الباقة الافتراضية
            <select
              value={form.defaultPlanCode}
              onChange={(e) => setForm({ ...form, defaultPlanCode: e.target.value })}
              className="input-field mt-1"
            >
              {plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.allowRegistration}
              onChange={(e) => setForm({ ...form, allowRegistration: e.target.checked })}
            />
            السماح بالتسجيل العام
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.trialEnabled}
              onChange={(e) => setForm({ ...form, trialEnabled: e.target.checked })}
            />
            تفعيل الفترة التجريبية
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.maintenanceMode}
              onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
            />
            وضع الصيانة
          </label>
        </div>

        <button type="submit" className="btn-teal w-full">
          حفظ الإعدادات
        </button>
      </form>
    </div>
  );
}
