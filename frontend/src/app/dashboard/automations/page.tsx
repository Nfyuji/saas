'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/ui';
import { Modal } from '@/components/modal';

interface Automation {
  _id: string;
  name: string;
  description?: string;
  trigger: string;
  triggerConfig: Record<string, unknown>;
  actions: Array<{ type: string; config: Record<string, unknown> }>;
  isActive: boolean;
  executionCount: number;
}

const triggerLabels: Record<string, string> = {
  keyword: 'كلمة مفتاحية في الرسالة',
  new_customer: 'عميل جديد (أول رسالة)',
  no_reply: 'لا رد من العميل',
  schedule: 'جدول زمني',
};

const actionLabels: Record<string, string> = {
  add_tag: 'إضافة وسم',
  send_message: 'إرسال رسالة',
  ai_reply: 'تفعيل رد AI',
  assign_agent: 'تعيين موظف',
  create_task: 'إنشاء مهمة',
};

const templates = [
  {
    id: 'price',
    name: 'اهتمام بالسعر',
    description: 'عند ذكر السعر أو العرض — وسّم العميل كمهتم',
    trigger: 'keyword',
    keywords: 'سعر,اسعار,كم,عرض,تخفيض',
    tag: 'مهتم-سعر',
    actionType: 'add_tag',
  },
  {
    id: 'welcome',
    name: 'ترحيب عميل جديد',
    description: 'أول رسالة من عميل جديد — وسّمه كعميل جديد',
    trigger: 'new_customer',
    keywords: '',
    tag: 'عميل-جديد',
    actionType: 'add_tag',
  },
  {
    id: 'support',
    name: 'طلب دعم',
    description: 'كلمات الشكاوى أو المساعدة — وسّم للدعم',
    trigger: 'keyword',
    keywords: 'مساعدة,مشكلة,شكوى,دعم,عطل',
    tag: 'دعم',
    actionType: 'add_tag',
  },
];

type FormState = {
  name: string;
  description: string;
  trigger: string;
  keywords: string;
  actionType: string;
  tag: string;
  message: string;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  trigger: 'keyword',
  keywords: '',
  actionType: 'add_tag',
  tag: '',
  message: '',
};

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'off'>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = () => {
    api.get<Automation[]>('/automations').then(setAutomations).catch(console.error);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const active = automations.filter((a) => a.isActive).length;
    const runs = automations.reduce((sum, a) => sum + (a.executionCount || 0), 0);
    return { total: automations.length, active, runs };
  }, [automations]);

  const visible = automations.filter((a) => {
    if (filter === 'active') return a.isActive;
    if (filter === 'off') return !a.isActive;
    return true;
  });

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setForm({
      name: t.name,
      description: t.description,
      trigger: t.trigger,
      keywords: t.keywords,
      actionType: t.actionType,
      tag: t.tag,
      message: '',
    });
    setShowForm(true);
  };

  const buildActions = () => {
    if (form.actionType === 'add_tag' && form.tag.trim()) {
      return [{ type: 'add_tag', config: { tag: form.tag.trim() } }];
    }
    if (form.actionType === 'send_message' && form.message.trim()) {
      return [{ type: 'send_message', config: { text: form.message.trim() } }];
    }
    if (form.actionType === 'ai_reply') {
      return [{ type: 'ai_reply', config: { enabled: true } }];
    }
    return [];
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const actions = buildActions();
      if (!actions.length) {
        setMessage('اختر إجراءً وأكمل حقوله (وسم أو رسالة)');
        setSaving(false);
        return;
      }
      await api.post('/automations', {
        name: form.name,
        description: form.description,
        trigger: form.trigger,
        triggerConfig:
          form.trigger === 'keyword'
            ? { keywords: form.keywords.split(/[,،]/).map((k) => k.trim()).filter(Boolean) }
            : {},
        actions,
        isActive: true,
      });
      setShowForm(false);
      setForm(emptyForm);
      setMessage('تم إنشاء الأتمتة');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الإنشاء');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string) => {
    await api.put(`/automations/${id}/toggle`);
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`حذف الأتمتة «${name}»؟`)) return;
    try {
      await api.delete(`/automations/${id}`);
      setMessage('تم الحذف');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  const triggerSummary = (a: Automation) => {
    if (a.trigger === 'keyword') {
      const keys = (a.triggerConfig?.keywords as string[]) || [];
      return keys.length ? keys.slice(0, 4).join(' · ') : 'كلمات مفتاحية';
    }
    return triggerLabels[a.trigger] || a.trigger;
  };

  const actionSummary = (a: Automation) => {
    if (!a.actions?.length) return 'بدون إجراء';
    return a.actions
      .map((act) => {
        if (act.type === 'add_tag') return `وسم: ${act.config.tag || '—'}`;
        if (act.type === 'send_message') return 'إرسال رسالة';
        return actionLabels[act.type] || act.type;
      })
      .join(' + ');
  };

  const isError = /فشل|اختر/i.test(message);

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="الأتمتة"
        subtitle="سيناريوهات إذا → إذن: محفّز من واتساب ثم إجراء تلقائي"
        eyebrow="Automations"
        actions={
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setShowForm(true);
            }}
            className="btn-orange text-sm"
          >
            + أتمتة جديدة
          </button>
        }
      />

      {message && <div className={isError ? 'alert-err' : 'alert-ok'}>{message}</div>}

      <div className="stat-grid !mb-0">
        <div className="mode-card !p-4">
          <p className="font-display text-2xl font-black text-[var(--teal-dark)]">{stats.total}</p>
          <p className="text-sm text-[var(--muted)] font-bold mt-1">إجمالي السيناريوهات</p>
        </div>
        <div className="mode-card !p-4">
          <p className="font-display text-2xl font-black text-[var(--teal-dark)]">{stats.active}</p>
          <p className="text-sm text-[var(--muted)] font-bold mt-1">مفعّلة الآن</p>
        </div>
        <div className="mode-card !p-4">
          <p className="font-display text-2xl font-black text-[var(--teal-dark)]">{stats.runs}</p>
          <p className="text-sm text-[var(--muted)] font-bold mt-1">مرات التنفيذ</p>
        </div>
      </div>

      {/* Templates */}
      <section className="surface-card p-5 sm:p-6">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] mb-1">ابدأ من قالب جاهز</h2>
        <p className="text-sm text-[var(--muted)] mb-4">انقر قالباً لملء النموذج — عدّل الكلمات ثم احفظ.</p>
        <div className="auto-templates">
          {templates.map((t) => (
            <button key={t.id} type="button" className="auto-template" onClick={() => applyTemplate(t.id)}>
              <strong>{t.name}</strong>
              <span>{t.description}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'الكل'],
            ['active', 'مفعّلة'],
            ['off', 'موقوفة'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={filter === id ? 'chip chip-teal' : 'chip chip-soft'}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={automations.length ? 'لا نتائج لهذا التصفية' : 'لا أتمتة بعد'}
          description="أنشئ سيناريو من قالب أعلاه، أو صمّم محفّزاً وإجراءً يشتغل عند رسائل واتساب."
          actionLabel="+ أتمتة جديدة"
          onAction={() => {
            setForm(emptyForm);
            setShowForm(true);
          }}
        />
      ) : (
        <div className="auto-list">
          {visible.map((a) => (
            <article key={a._id} className={`auto-card ${a.isActive ? 'is-on' : 'is-off'}`}>
              <div className="auto-card-top">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-display font-extrabold text-[var(--teal-dark)] m-0 truncate">
                      {a.name}
                    </h3>
                    <span className={`badge ${a.isActive ? 'badge-ok' : 'badge-off'}`}>
                      {a.isActive ? 'مفعّلة' : 'موقوفة'}
                    </span>
                  </div>
                  {a.description && (
                    <p className="text-sm text-[var(--muted)] m-0 leading-relaxed">{a.description}</p>
                  )}
                </div>
                <p className="text-xs font-bold text-[var(--muted)] shrink-0">
                  نُفّذت {a.executionCount || 0}×
                </p>
              </div>

              <div className="auto-flow" aria-label="تدفق الأتمتة">
                <div className="auto-node">
                  <span className="auto-node-label">متى؟</span>
                  <strong>{triggerLabels[a.trigger] || a.trigger}</strong>
                  <span className="auto-node-meta">{triggerSummary(a)}</span>
                </div>
                <div className="auto-arrow" aria-hidden>
                  ←
                </div>
                <div className="auto-node action">
                  <span className="auto-node-label">ماذا؟</span>
                  <strong>{actionSummary(a)}</strong>
                  <span className="auto-node-meta">
                    {(a.actions || []).map((x) => actionLabels[x.type] || x.type).join(' · ') || '—'}
                  </span>
                </div>
              </div>

              <div className="auto-card-actions">
                <button
                  type="button"
                  onClick={() => toggle(a._id)}
                  className={a.isActive ? 'btn-ghost text-sm' : 'btn-teal text-sm'}
                >
                  {a.isActive ? 'إيقاف' : 'تشغيل'}
                </button>
                <button
                  type="button"
                  onClick={() => remove(a._id, a.name)}
                  className="btn-ghost text-sm text-[var(--orange)]"
                >
                  حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} labelledBy="auto-form-title">
          <form
            onSubmit={handleCreate}
            className="modal-panel surface-card p-4 sm:p-6 space-y-4"
            style={{ width: 'min(100%, 36rem)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="auto-form-title" className="font-display font-extrabold text-xl text-[var(--teal-dark)] m-0">
                  إنشاء أتمتة
                </h2>
                <p className="text-sm text-[var(--muted)] mt-1 mb-0">حدّد المحفّز ثم الإجراء</p>
              </div>
              <button type="button" className="btn-ghost !px-3" onClick={() => setShowForm(false)} aria-label="إغلاق">
                ✕
              </button>
            </div>

            <label className="block text-sm font-bold">
              الاسم
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field mt-1.5"
                placeholder="مثال: اهتمام بالسعر"
              />
            </label>

            <label className="block text-sm font-bold">
              الوصف <span className="text-[var(--muted)] font-medium">(اختياري)</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field mt-1.5"
                placeholder="ماذا يفعل هذا السيناريو؟"
              />
            </label>

            <div className="auto-form-split">
              <div className="space-y-3">
                <p className="text-xs font-extrabold text-[var(--teal)] m-0">1 · المحفّز</p>
                <select
                  value={form.trigger}
                  onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                  className="input-field"
                >
                  <option value="keyword">كلمة مفتاحية</option>
                  <option value="new_customer">عميل جديد</option>
                </select>
                {form.trigger === 'keyword' && (
                  <label className="block text-sm font-bold">
                    الكلمات (فاصلة)
                    <input
                      required
                      value={form.keywords}
                      onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                      className="input-field mt-1.5"
                      placeholder="سعر,عرض,كم"
                    />
                  </label>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-extrabold text-[var(--orange)] m-0">2 · الإجراء</p>
                <select
                  value={form.actionType}
                  onChange={(e) => setForm({ ...form, actionType: e.target.value })}
                  className="input-field"
                >
                  <option value="add_tag">إضافة وسم للعميل</option>
                  <option value="send_message">إرسال رسالة (يُحفظ للإطلاق)</option>
                  <option value="ai_reply">تعليم كمسار AI</option>
                </select>
                {form.actionType === 'add_tag' && (
                  <label className="block text-sm font-bold">
                    الوسم
                    <input
                      required
                      value={form.tag}
                      onChange={(e) => setForm({ ...form, tag: e.target.value })}
                      className="input-field mt-1.5"
                      placeholder="مهتم"
                    />
                  </label>
                )}
                {form.actionType === 'send_message' && (
                  <label className="block text-sm font-bold">
                    نص الرسالة
                    <textarea
                      required
                      rows={3}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="input-field mt-1.5"
                      placeholder="شكراً لتواصلك! سنرسل لك التفاصيل خلال دقائق..."
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-3 form-actions">
              <button type="submit" disabled={saving} className="btn-orange flex-1 justify-center disabled:opacity-50">
                {saving ? 'جاري الحفظ...' : 'حفظ الأتمتة'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">
                إلغاء
              </button>
            </div>
          </form>
      </Modal>
    </div>
  );
}
