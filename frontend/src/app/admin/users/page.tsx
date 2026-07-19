'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  lastLoginAt?: string;
  companyId?: { _id: string; name: string; plan?: string; isActive?: boolean } | string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    api
      .get<PlatformUser[]>(`/platform-admin/users${q}`)
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page-wrap">
      <div className="mb-6">
        <h1 className="page-title">المستخدمون</h1>
        <p className="page-sub">جميع مستخدمي الشركات المشتركة</p>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="بحث بالاسم أو الإيميل..."
          className="input-field flex-1"
        />
        <button onClick={load} className="btn-teal text-sm !py-2.5">
          بحث
        </button>
      </div>

      <div className="table-wrap">
        {loading ? (
          <p className="empty-state">جاري التحميل...</p>
        ) : !users.length ? (
          <p className="empty-state">لا مستخدمين</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الشركة</th>
                <th>الدور</th>
                <th>آخر دخول</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const company = typeof u.companyId === 'object' && u.companyId ? u.companyId : null;
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="icon-badge orange text-xs font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-[var(--muted)]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {company ? (
                        <Link href={`/admin/subscribers/${company._id}`} className="text-[var(--teal)] hover:underline font-medium">
                          {company.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className="badge badge-off">{u.role}</span>
                    </td>
                    <td className="text-[var(--muted)]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ar') : '—'}
                    </td>
                    <td>
                      <button
                        onClick={async () => {
                          await api.put(`/platform-admin/users/${u._id}/status`, { isActive: u.isActive === false });
                          load();
                        }}
                        className={`chip text-xs ${u.isActive === false ? 'chip-teal' : 'chip-orange'}`}
                      >
                        {u.isActive === false ? 'تفعيل' : 'إيقاف'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
