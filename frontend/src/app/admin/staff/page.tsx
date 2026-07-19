'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Staff {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

export default function AdminStaffPage() {
  const [list, setList] = useState<Staff[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '123456',
    role: 'platform_support',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get<Staff[]>('/platform-admin/platform-admins').then(setList).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/platform-admin/platform-admins', form);
      setMessage('تم إنشاء حساب الأدمن');
      setForm({ name: '', email: '', password: '123456', role: 'platform_support' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل');
    }
  };

  return (
    <div className="page-wrap max-w-3xl">
      <div className="mb-6">
        <h1 className="page-title">أدمن المنصة</h1>
        <p className="page-sub">Super / دعم / مالية</p>
      </div>

      {message && <div className="alert-ok">{message}</div>}
      {error && <div className="alert-err">{error}</div>}

      <form onSubmit={create} className="surface-card p-6 space-y-3 mb-6">
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)]">إضافة أدمن</h2>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="الاسم" className="input-field" />
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="البريد" className="input-field" dir="ltr" />
        <input required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="كلمة المرور" className="input-field" dir="ltr" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
          <option value="super_admin">Super Admin</option>
          <option value="platform_support">دعم</option>
          <option value="platform_finance">مالية</option>
        </select>
        <button type="submit" className="btn-teal w-full">إنشاء</button>
      </form>

      <div className="surface-card divide-y divide-[var(--border)]">
        {list.length === 0 ? (
          <p className="empty-state">لا أعضاء فريق بعد</p>
        ) : (
          list.map((s) => (
            <div key={s._id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-[var(--muted)]">{s.email}</p>
              </div>
              <span className="badge badge-ok">{s.role}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
