'use client';

import { useEffect, useState } from 'react';
import { Ban, ShieldOff, Smartphone } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';

interface DeviceBan {
  _id: string;
  fingerprint: string;
  reason?: string;
  isActive: boolean;
  bannedByEmail?: string;
  userAgent?: string;
  lastIp?: string;
  ipHistory?: string[];
  bannedAt?: string;
  revokedAt?: string;
  createdAt?: string;
}

interface DeviceVisit {
  _id: string;
  fingerprint: string;
  userAgent?: string;
  lastIp?: string;
  lastUserEmail?: string;
  visitCount?: number;
  lastSeenAt?: string;
  meta?: Record<string, unknown>;
}

export default function AdminDeviceBansPage() {
  const [bans, setBans] = useState<DeviceBan[]>([]);
  const [visits, setVisits] = useState<DeviceVisit[]>([]);
  const [tab, setTab] = useState<'bans' | 'visits'>('visits');
  const [manualFp, setManualFp] = useState('');
  const [myFp, setMyFp] = useState('');
  const [reason, setReason] = useState('حظر نهائي من الأدمن');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('@/lib/device').then((m) => m.getDeviceFingerprint().then(setMyFp)).catch(() => undefined);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [b, v] = await Promise.all([
        api.get<DeviceBan[]>('/platform-admin/device-bans'),
        api.get<DeviceVisit[]>('/platform-admin/device-bans/visits?limit=150'),
      ]);
      setBans(b);
      setVisits(v);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const banFingerprint = async (fingerprint: string, customReason?: string) => {
    setMessage('');
    if (myFp && fingerprint === myFp) {
      if (!confirm('هذا جهازك الحالي! هل تريد حظر نفسك؟')) return;
    }
    try {
      await api.post('/platform-admin/device-bans', {
        fingerprint,
        reason: customReason || reason,
      });
      setMessage('تم حظر الجهاز نهائياً');
      setManualFp('');
      await load();
      setTab('bans');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الحظر');
    }
  };

  const banVisit = async (visitId: string) => {
    if (!confirm('حظر هذا الجهاز نهائياً؟ لن يستطيع فتح الموقع حتى مع تغيير VPN.')) return;
    setMessage('');
    try {
      await api.post(`/platform-admin/device-bans/from-visit/${visitId}`, { reason });
      setMessage('تم حظر الجهاز');
      await load();
      setTab('bans');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الحظر');
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('إلغاء الحظر عن هذا الجهاز؟')) return;
    try {
      await api.put(`/platform-admin/device-bans/${id}/revoke`);
      setMessage('تم إلغاء الحظر');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل إلغاء الحظر');
    }
  };

  const isError = /فشل|خطأ|غير/i.test(message);
  const bannedSet = new Set(bans.filter((b) => b.isActive).map((b) => b.fingerprint));

  return (
    <div className="page-wrap space-y-5">
      <PageHeader
        title="حظر الأجهزة"
        subtitle="احظر أي جهاز ببصمته — يبقى ممنوعاً حتى لو غيّر VPN أو الشبكة"
        eyebrow="Device Ban"
      />

      <div className="surface-card p-4 text-sm text-[var(--muted)] leading-7">
        الحظر يعتمد على <strong className="text-[var(--teal-dark)]">بصمة المتصفح/الجهاز</strong> وليس IP
        فقط. تغيير VPN لا يزيل الحظر. مسح بيانات المتصفح بالكامل أو جهاز مختلف قد يتجاوزه — وهذا حدّ تقني لأي
        موقع ويب.
        {myFp ? (
          <p className="mt-2 mb-0 text-xs" dir="ltr">
            جهازك الحالي: <code className="text-[var(--teal-dark)]">{myFp}</code>
          </p>
        ) : null}
      </div>

      {message && <div className={isError ? 'alert-err' : 'alert-ok'}>{message}</div>}

      <form
        className="surface-card p-4 sm:p-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          banFingerprint(manualFp.trim());
        }}
      >
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0 inline-flex items-center gap-2">
          <Ban size={18} />
          حظر يدوي ببصمة الجهاز
        </h2>
        <label className="block text-sm font-bold">
          بصمة الجهاز (Fingerprint)
          <input
            required
            minLength={8}
            value={manualFp}
            onChange={(e) => setManualFp(e.target.value)}
            className="input-field mt-1.5 font-mono text-xs"
            dir="ltr"
            placeholder="bos_...."
          />
        </label>
        <label className="block text-sm font-bold">
          السبب
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field mt-1.5"
          />
        </label>
        <button type="submit" className="btn-orange">
          حظر نهائي
        </button>
      </form>

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          className={tab === 'visits' ? 'btn-teal text-sm' : 'btn-ghost text-sm'}
          onClick={() => setTab('visits')}
        >
          <Smartphone size={15} />
          الأجهزة التي زارت الموقع
        </button>
        <button
          type="button"
          className={tab === 'bans' ? 'btn-teal text-sm' : 'btn-ghost text-sm'}
          onClick={() => setTab('bans')}
        >
          <ShieldOff size={15} />
          قائمة المحظورين ({bans.filter((b) => b.isActive).length})
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={load}>
          تحديث
        </button>
      </div>

      {loading ? (
        <p className="empty-state">جاري التحميل...</p>
      ) : tab === 'visits' ? (
        <div className="table-wrap">
          {!visits.length ? (
            <p className="empty-state">لا زيارات بعد — افتح الموقع من أي جهاز لتظهر هنا</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>البصمة</th>
                  <th>آخر IP</th>
                  <th>المستخدم</th>
                  <th>الزيارات</th>
                  <th>آخر ظهور</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v._id}>
                    <td className="font-mono text-[11px] max-w-[140px] truncate" dir="ltr" title={v.fingerprint}>
                      {v.fingerprint}
                    </td>
                    <td className="text-xs" dir="ltr">
                      {v.lastIp || '—'}
                    </td>
                    <td className="text-xs">{v.lastUserEmail || 'زائر'}</td>
                    <td>{v.visitCount || 1}</td>
                    <td className="text-xs text-[var(--muted)]">
                      {v.lastSeenAt ? new Date(v.lastSeenAt).toLocaleString('ar') : '—'}
                    </td>
                    <td>
                      {bannedSet.has(v.fingerprint) ? (
                        <span className="badge badge-off">محظور</span>
                      ) : (
                        <button
                          type="button"
                          className="chip chip-orange text-xs"
                          onClick={() => banVisit(v._id)}
                        >
                          حظر نهائي
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          {!bans.length ? (
            <p className="empty-state">لا أجهزة محظورة</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>البصمة</th>
                  <th>السبب</th>
                  <th>الحالة</th>
                  <th>بواسطة</th>
                  <th>تاريخ الحظر</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {bans.map((b) => (
                  <tr key={b._id}>
                    <td className="font-mono text-[11px] max-w-[140px] truncate" dir="ltr" title={b.fingerprint}>
                      {b.fingerprint}
                    </td>
                    <td className="text-sm">{b.reason || '—'}</td>
                    <td>
                      <span className={`badge ${b.isActive ? 'badge-off' : 'badge-ok'}`}>
                        {b.isActive ? 'نشط' : 'ملغى'}
                      </span>
                    </td>
                    <td className="text-xs">{b.bannedByEmail || '—'}</td>
                    <td className="text-xs text-[var(--muted)]">
                      {b.bannedAt ? new Date(b.bannedAt).toLocaleString('ar') : '—'}
                    </td>
                    <td>
                      {b.isActive ? (
                        <button type="button" className="chip chip-soft text-xs" onClick={() => revoke(b._id)}>
                          إلغاء الحظر
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="chip chip-orange text-xs"
                          onClick={() => banFingerprint(b.fingerprint, b.reason)}
                        >
                          إعادة الحظر
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
