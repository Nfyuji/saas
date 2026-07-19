'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface PlanRow {
  _id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  features: string[];
  limits?: Record<string, number>;
  popular?: boolean;
  isActive?: boolean;
  visibleToCustomers?: boolean;
  sortOrder?: number;
  salesAgentEnabled?: boolean;
  autoFollowUp?: boolean;
  invoicesEnabled?: boolean;
  knowledgeEnabled?: boolean;
  opportunitiesEnabled?: boolean;
  subscribersCount?: number;
}

const emptyForm = {
  code: '',
  name: '',
  description: '',
  price: 0,
  currency: 'USD',
  featuresText: '',
  conversations: 1000,
  agents: 5,
  knowledgeDocs: 20,
  teamUsers: 3,
  whatsappNumbers: 1,
  messagesPerDay: 200,
  popular: false,
  isActive: true,
  visibleToCustomers: true,
  sortOrder: 10,
  salesAgentEnabled: true,
  autoFollowUp: false,
  invoicesEnabled: false,
  knowledgeEnabled: true,
  opportunitiesEnabled: false,
};

function limitLabel(n?: number) {
  if (n == null) return '—';
  if (n < 0) return '∞';
  return String(n);
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    api
      .get<PlanRow[]>('/platform-admin/plans')
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  };

  const openEdit = (p: PlanRow) => {
    setEditingId(p._id);
    setForm({
      code: p.code,
      name: p.name,
      description: p.description || '',
      price: p.price,
      currency: p.currency || 'USD',
      featuresText: (p.features || []).join('\n'),
      conversations: p.limits?.conversations ?? 1000,
      agents: p.limits?.agents ?? 5,
      knowledgeDocs: p.limits?.knowledgeDocs ?? 20,
      teamUsers: p.limits?.teamUsers ?? 3,
      whatsappNumbers: p.limits?.whatsappNumbers ?? 1,
      messagesPerDay: p.limits?.messagesPerDay ?? 200,
      popular: !!p.popular,
      isActive: p.isActive !== false,
      visibleToCustomers: p.visibleToCustomers !== false,
      sortOrder: p.sortOrder ?? 10,
      salesAgentEnabled: !!p.salesAgentEnabled,
      autoFollowUp: !!p.autoFollowUp,
      invoicesEnabled: !!p.invoicesEnabled,
      knowledgeEnabled: !!p.knowledgeEnabled,
      opportunitiesEnabled: !!p.opportunitiesEnabled,
    });
    setShowForm(true);
    setError('');
  };

  const payload = () => ({
    code: form.code,
    name: form.name,
    description: form.description,
    price: Number(form.price),
    currency: form.currency,
    features: form.featuresText
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean),
    limits: {
      conversations: Number(form.conversations),
      agents: Number(form.agents),
      knowledgeDocs: Number(form.knowledgeDocs),
      teamUsers: Number(form.teamUsers),
      whatsappNumbers: Number(form.whatsappNumbers),
      messagesPerDay: Number(form.messagesPerDay),
    },
    popular: form.popular,
    isActive: form.isActive,
    visibleToCustomers: form.visibleToCustomers,
    sortOrder: Number(form.sortOrder),
    salesAgentEnabled: form.salesAgentEnabled,
    autoFollowUp: form.autoFollowUp,
    invoicesEnabled: form.invoicesEnabled,
    knowledgeEnabled: form.knowledgeEnabled,
    opportunitiesEnabled: form.opportunitiesEnabled,
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/platform-admin/plans/${editingId}`, payload());
        setMessage('تم تحديث الباقة');
      } else {
        await api.post('/platform-admin/plans', payload());
        setMessage('تم إنشاء الباقة');
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  };

  const toggle = async (id: string, field: 'isActive' | 'visibleToCustomers' | 'popular') => {
    await api.put(`/platform-admin/plans/${id}/toggle`, { field });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('حذف الباقة نهائياً؟')) return;
    try {
      await api.delete(`/platform-admin/plans/${id}`);
      setMessage('تم حذف الباقة');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="pill pill-teal mb-3 text-xs !py-1.5 w-fit">Plans</div>
          <h1 className="font-display text-3xl font-black text-[var(--teal-dark)]">إدارة الباقات</h1>
          <p className="text-[var(--muted)] mt-1">أسعار · مزايا · حدود · ظهور للعملاء</p>
        </div>
        <button onClick={openCreate} className="btn-orange text-sm">
          + باقة جديدة
        </button>
      </div>

      {message && (
        <div className="mb-4 bg-[var(--teal-soft)] text-[var(--teal-dark)] px-4 py-3 rounded-2xl text-sm font-bold">
          {message}
        </div>
      )}
      {error && !showForm && (
        <div className="mb-4 bg-[var(--orange-soft)] text-[var(--orange-dark)] px-4 py-3 rounded-2xl text-sm font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[var(--muted)]">جاري التحميل...</p>
      ) : plans.length === 0 ? (
        <div className="surface-card p-10 text-center text-[var(--muted)]">لا باقات بعد — أنشئ أول باقة</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {plans.map((p, idx) => {
            const tone = p.popular ? 'orange' : idx % 2 === 0 ? 'teal' : 'sky';
            return (
              <div key={p._id} className={`mode-card ${p.popular || p.isActive ? '' : 'opacity-80'} ${p.popular ? 'active' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-display text-xl font-extrabold text-[var(--teal-dark)]">{p.name}</h3>
                      <span className="text-[11px] font-bold bg-[var(--teal-soft)] text-[var(--teal-dark)] px-2.5 py-0.5 rounded-full" dir="ltr">
                        {p.code}
                      </span>
                      {p.popular && (
                        <span className="text-[11px] font-bold text-[var(--orange)] bg-[var(--orange-soft)] px-2.5 py-0.5 rounded-full">
                          الأشهر
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted)] leading-relaxed">{p.description || 'بدون وصف'}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <span className={`icon-badge ${tone} mb-2 mx-auto`}>⭐</span>
                    <p className="font-display text-2xl font-black text-[var(--teal-dark)]">
                      ${p.price}
                      <span className="text-xs text-[var(--muted)] font-bold">/{p.currency}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3 text-[11px] font-bold">
                  <span className="px-2.5 py-1 rounded-full bg-[var(--teal-soft)] text-[var(--teal-dark)]">
                    مشتركون: {p.subscribersCount || 0}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full ${p.isActive ? 'bg-[var(--teal-soft)] text-[var(--teal)]' : 'bg-[var(--orange-soft)] text-[var(--orange-dark)]'}`}>
                    {p.isActive ? 'مفعّلة' : 'معطّلة'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-white border border-[var(--border)] text-[var(--muted)]">
                    {p.visibleToCustomers ? 'ظاهرة' : 'مخفية'}
                  </span>
                </div>

                <ul className="text-sm text-[var(--muted)] space-y-1 mb-3 max-h-24 overflow-auto pr-1">
                  {(p.features || []).slice(0, 5).map((f) => (
                    <li key={f}>✔ {f}</li>
                  ))}
                  {(p.features || []).length > 5 && (
                    <li className="text-[var(--teal)] font-bold">+{(p.features || []).length - 5} مزايا أخرى</li>
                  )}
                </ul>

                <div className="steps-row !mt-2 mb-4">
                  <span>محادثات {limitLabel(p.limits?.conversations)}</span>
                  <span>رسائل/يوم {limitLabel(p.limits?.messagesPerDay)}</span>
                  <span>فريق {limitLabel(p.limits?.teamUsers)}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--border)]">
                  <button onClick={() => openEdit(p)} className="btn-teal !py-1.5 !px-3 text-xs">
                    تعديل
                  </button>
                  <button onClick={() => toggle(p._id, 'isActive')} className="btn-ghost !py-1.5 !px-3 text-xs">
                    {p.isActive ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button onClick={() => toggle(p._id, 'visibleToCustomers')} className="btn-ghost !py-1.5 !px-3 text-xs">
                    {p.visibleToCustomers ? 'إخفاء' : 'إظهار'}
                  </button>
                  <button
                    onClick={() => toggle(p._id, 'popular')}
                    className="!py-1.5 !px-3 text-xs rounded-full font-bold bg-[var(--orange-soft)] text-[var(--orange-dark)]"
                  >
                    {p.popular ? 'إلغاء الأشهر' : 'الأشهر'}
                  </button>
                  <button
                    onClick={() => remove(p._id)}
                    className="!py-1.5 !px-3 text-xs rounded-full font-bold text-[var(--orange-dark)] hover:bg-[var(--orange-soft)]"
                  >
                    حذف
                  </button>
                </div>

                <div className="corner-blob" style={{ background: tone === 'orange' ? 'var(--orange-soft)' : tone === 'sky' ? 'var(--sky-soft)' : 'var(--teal-soft)' }} />
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <form onSubmit={save} className="modal-panel surface-card p-4 sm:p-6 space-y-4 animate-rise" style={{ width: 'min(100%, 42rem)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="pill pill-teal text-xs !py-1 mb-2 w-fit">{editingId ? 'تعديل' : 'جديد'}</div>
                <h2 className="font-display text-xl font-black text-[var(--teal-dark)]">
                  {editingId ? 'تعديل الباقة' : 'إنشاء باقة جديدة'}
                </h2>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="w-10 h-10 rounded-full bg-[var(--teal-soft)] font-bold text-[var(--teal-dark)]">
                ✕
              </button>
            </div>

            {error && (
              <div className="bg-[var(--orange-soft)] text-[var(--orange-dark)] px-3 py-2 rounded-2xl text-sm font-bold">{error}</div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <input
                required
                disabled={!!editingId}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="رمز الباقة (مثل pro)"
                className="input-field"
                dir="ltr"
              />
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="اسم الباقة"
                className="input-field"
              />
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                placeholder="السعر"
                className="input-field"
              />
              <input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                placeholder="العملة"
                className="input-field"
                dir="ltr"
              />
            </div>

            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="وصف قصير"
              className="input-field"
            />

            <textarea
              value={form.featuresText}
              onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
              rows={4}
              placeholder="المزايا (سطر لكل ميزة)"
              className="input-field resize-none"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ['conversations', 'محادثات'],
                ['agents', 'وكلاء AI'],
                ['knowledgeDocs', 'مستندات معرفة'],
                ['teamUsers', 'أعضاء الفريق'],
                ['whatsappNumbers', 'أرقام واتساب'],
                ['messagesPerDay', 'رسائل/يوم'],
                ['sortOrder', 'ترتيب العرض'],
              ].map(([key, label]) => (
                <label key={key} className="text-xs font-bold text-[var(--muted)]">
                  {label}
                  <input
                    type="number"
                    value={form[key as keyof typeof form] as number}
                    onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                    className="input-field mt-1 !py-2"
                  />
                </label>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-2 text-sm font-bold text-[var(--teal-dark)]">
              {[
                ['popular', 'الأكثر طلباً'],
                ['isActive', 'مفعّلة'],
                ['visibleToCustomers', 'ظاهرة للعملاء'],
                ['salesAgentEnabled', 'مندوب مبيعات AI'],
                ['autoFollowUp', 'متابعة تلقائية'],
                ['invoicesEnabled', 'فواتير'],
                ['knowledgeEnabled', 'قاعدة معرفة'],
                ['opportunitiesEnabled', 'فرص ضائعة'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer rounded-2xl bg-[var(--teal-soft)]/40 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    className="accent-[var(--teal)] w-4 h-4"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-orange flex-1 justify-center">
                ▶ حفظ
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
