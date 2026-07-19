'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function TeamPage() {
  const [members, setMembers] = useState<Array<{ _id: string; name: string; email: string; role: string }>>([]);
  const [invites, setInvites] = useState<Array<{ _id: string; email: string; role: string; acceptUrl?: string }>>([]);
  const [branding, setBranding] = useState({ logoUrl: '', primaryColor: '#2563eb', accentColor: '#7c3aed', companyDisplayName: '' });
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('agent');
  const [message, setMessage] = useState('');
  const [lastInviteUrl, setLastInviteUrl] = useState('');

  const load = () => {
    api.get<typeof members>('/team/members').then(setMembers).catch(console.error);
    api.get<typeof invites>('/team/invites').then(setInvites).catch(console.error);
    api.get<{ branding?: typeof branding; name?: string }>('/team/branding').then((r) => {
      if (r.branding) setBranding({ ...branding, ...r.branding });
    }).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post<{ acceptUrl: string }>('/team/invite', { email, role });
    setLastInviteUrl(res.acceptUrl);
    setMessage('تم إنشاء الدعوة');
    setEmail('');
    load();
  };

  const saveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.put('/team/branding', branding);
    setMessage('تم حفظ الهوية البصرية');
  };

  return (
    <div className="page-wrap max-w-3xl space-y-8">
      <div>
        <h1 className="page-title">الفريق والهوية</h1>
        <p className="page-sub">دعوات الأعضاء + White-label</p>
      </div>

      {message && <div className="alert-ok">{message}</div>}
      {lastInviteUrl && (
        <div className="alert-ok break-all" dir="ltr">{lastInviteUrl}</div>
      )}

      <form onSubmit={invite} className="surface-card p-6 space-y-3">
        <h2 className="font-bold">دعوة عضو</h2>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="input-field" dir="ltr" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
          <option value="admin">admin</option>
          <option value="agent">agent</option>
          <option value="viewer">viewer</option>
        </select>
        <button className="btn-teal w-full justify-center">إرسال دعوة</button>
      </form>

      <div className="surface-card p-6">
        <h2 className="font-bold mb-3">الأعضاء</h2>
        {members.map((m) => (
          <div key={m._id} className="flex justify-between py-2 border-b border-[var(--border)] text-sm">
            <span>{m.name} · {m.email}</span>
            <span className="badge badge-ok">{m.role}</span>
          </div>
        ))}
      </div>

      <div className="surface-card p-6">
        <h2 className="font-bold mb-3">دعوات معلّقة</h2>
        {invites.length ? invites.map((i) => (
          <div key={i._id} className="flex justify-between py-2 text-sm">
            <span>{i.email}</span>
            <button onClick={() => api.delete(`/team/invites/${i._id}`).then(load)} className="chip chip-orange">إلغاء</button>
          </div>
        )) : <p className="text-[var(--muted)] text-sm">لا دعوات</p>}
      </div>

      <form onSubmit={saveBranding} className="surface-card p-6 space-y-3">
        <h2 className="font-bold">White-label</h2>
        <input value={branding.companyDisplayName} onChange={(e) => setBranding({ ...branding, companyDisplayName: e.target.value })} placeholder="اسم العرض" className="input-field" />
        <input value={branding.logoUrl} onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })} placeholder="رابط الشعار" className="input-field" dir="ltr" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={branding.primaryColor} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })} className="input-field" dir="ltr" />
          <input value={branding.accentColor} onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })} className="input-field" dir="ltr" />
        </div>
        <button className="btn-orange w-full justify-center">حفظ الهوية</button>
      </form>
    </div>
  );
}
