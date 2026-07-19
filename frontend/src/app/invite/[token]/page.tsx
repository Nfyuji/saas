'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/team/accept/${token}`, { name, password });
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل قبول الدعوة');
    }
  };

  return (
    <div className="app-shell flex items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="surface-card p-8 w-full max-w-md space-y-4 page-wrap">
        <div className="text-center mb-2">
          <div className="pill pill-teal mx-auto mb-3">◆ دعوة فريق</div>
          <h1 className="page-title !text-2xl">قبول دعوة الفريق</h1>
          <p className="page-sub">أنشئ حسابك للانضمام للشركة</p>
        </div>
        {error && <div className="alert-err !mb-0">{error}</div>}
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" className="input-field" />
        <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="input-field" dir="ltr" />
        <button className="btn-orange w-full justify-center">▶ إنشاء الحساب</button>
        <p className="text-center text-sm text-[var(--muted)]">
          <Link href="/login" className="text-[var(--teal)] font-bold">تسجيل الدخول</Link>
        </p>
      </form>
    </div>
  );
}
