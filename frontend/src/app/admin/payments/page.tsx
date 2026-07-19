'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Row {
  _id: string;
  number: string;
  planCode: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paidAt?: string;
  createdAt?: string;
  companyId?: { name?: string; email?: string } | string;
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    api.get<Row[]>('/platform-admin/subscription-invoices').then(setRows).catch(console.error);
  }, []);

  return (
    <div className="page-wrap">
      <div className="mb-6">
        <h1 className="page-title">مدفوعات الاشتراك</h1>
        <p className="page-sub">فواتير اشتراك المنصة (Stripe / Moyasar / Demo)</p>
      </div>

      <div className="table-wrap">
        {!rows.length ? (
          <p className="empty-state">لا فواتير اشتراك بعد</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>الرقم</th>
                <th>الشركة</th>
                <th>الباقة</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>المزود</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const company = typeof r.companyId === 'object' && r.companyId ? r.companyId.name : '—';
                return (
                  <tr key={r._id}>
                    <td dir="ltr">{r.number}</td>
                    <td>{company}</td>
                    <td>{r.planCode}</td>
                    <td>${r.amount} {r.currency}</td>
                    <td>
                      <span className={`badge ${r.status === 'paid' ? 'badge-ok' : 'badge-warn'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{r.provider}</td>
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
