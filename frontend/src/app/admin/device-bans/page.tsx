'use client';

import { useEffect, useState } from 'react';
import { Ban, ShieldOff, Smartphone, Activity, Unlock } from 'lucide-react';
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
  attemptCount?: number;
  lastAttemptAt?: string;
  lastAttemptIp?: string;
  lastAttemptPath?: string;
}

interface DeviceVisit {
  _id: string;
  fingerprint: string;
  userAgent?: string;
  lastIp?: string;
  lastUserEmail?: string;
  visitCount?: number;
  lastSeenAt?: string;
}

interface DeviceAttempt {
  _id: string;
  fingerprint: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  source?: string;
  attemptedAt?: string;
}

export default function AdminDeviceBansPage() {
  const [bans, setBans] = useState<DeviceBan[]>([]);
  const [visits, setVisits] = useState<DeviceVisit[]>([]);
  const [attempts, setAttempts] = useState<DeviceAttempt[]>([]);
  const [tab, setTab] = useState<'visits' | 'bans' | 'attempts'>('bans');
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
      const [b, v, a] = await Promise.all([
        api.get<DeviceBan[]>('/platform-admin/device-bans'),
        api.get<DeviceVisit[]>('/platform-admin/device-bans/visits?limit=150'),
        api.get<DeviceAttempt[]>('/platform-admin/device-bans/attempts?limit=200'),
      ]);
      setBans(b);
      setVisits(v);
      setAttempts(a);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
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

  const unban = async (id: string, label?: string) => {
    if (!confirm(`رفع الحظر${label ? ` عن ${label}` : ''}؟ سيتمكن الجهاز من الدخول مجدداً.`)) return;
    setMessage('');
    try {
      await api.put(`/platform-admin/device-bans/${id}/revoke`);
      setMessage('تم رفع الحظر بنجاح');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل رفع الحظر');
    }
  };

  const isError = /فشل|خطأ|غير/i.test(message);
  const activeBans = bans.filter((b) => b.isActive);
  const bannedMap = new Map(activeBans.map((b) => [b.fingerprint, b]));
  const attemptTotal = activeBans.reduce((s, b) => s + (b.attemptCount || 0), 0);

  return (
    <div className="page-wrap space-y-5">
      <PageHeader
        title="حظر الأجهزة"
        subtitle="احظر، ارفع الحظر، وتابع من يحاول الدخول بعد الحظر"
        eyebrow="Device Ban"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs text-[var(--muted)] m-0">محظورون نشطون</p>
          <p className="font-display font-black text-2xl text-[var(--orange-dark)] m-0 mt-1">
            {activeBans.length}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-[var(--muted)] m-0">محاولات بعد الحظر</p>
          <p className="font-display font-black text-2xl text-[var(--teal-dark)] m-0 mt-1">
            {attemptTotal}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-[var(--muted)] m-0">أجهزة زارت الموقع</p>
          <p className="font-display font-black text-2xl m-0 mt-1">{visits.length}</p>
        </div>
      </div>

      <div className="surface-card p-4 text-sm text-[var(--muted)] leading-7">
        الحظر ببصمة الجهاز (ليس IP فقط) — تغيير VPN لا يكفي. من قائمة المحظورين اضغط{' '}
        <strong className="text-[var(--teal-dark)]">رفع الحظر</strong> لإعادة السماح.
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
          className={tab === 'bans' ? 'btn-teal text-sm' : 'btn-ghost text-sm'}
          onClick={() => setTab('bans')}
        >
          <ShieldOff size={15} />
          المحظورون ({activeBans.length})
        </button>
        <button
          type="button"
          className={tab === 'attempts' ? 'btn-teal text-sm' : 'btn-ghost text-sm'}
          onClick={() => setTab('attempts')}
        >
          <Activity size={15} />
          محاولات الدخول ({attempts.length})
        </button>
        <button
          type="button"
          className={tab === 'visits' ? 'btn-teal text-sm' : 'btn-ghost text-sm'}
          onClick={() => setTab('visits')}
        >
          <Smartphone size={15} />
          كل الزيارات
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={load}>
          تحديث
        </button>
      </div>

      {loading ? (
        <p className="empty-state">جاري التحميل...</p>
      ) : tab === 'bans' ? (
        <div className="table-wrap">
          {!bans.length ? (
            <p className="empty-state">لا أجهزة محظورة</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>البصمة</th>
                  <th>السبب</th>
                  <th>محاولات بعد الحظر</th>
                  <th>آخر محاولة</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {bans.map((b) => (
                  <tr key={b._id}>
                    <td className="font-mono text-[11px] max-w-[120px] truncate" dir="ltr" title={b.fingerprint}>
                      {b.fingerprint}
                    </td>
                    <td className="text-sm">{b.reason || '—'}</td>
                    <td>
                      <span className="font-bold text-[var(--orange-dark)]">{b.attemptCount || 0}</span>
                      {b.lastAttemptIp ? (
                        <span className="block text-[10px] text-[var(--muted)]" dir="ltr">
                          {b.lastAttemptIp}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-xs text-[var(--muted)]">
                      {b.lastAttemptAt ? new Date(b.lastAttemptAt).toLocaleString('ar') : 'لا توجد'}
                    </td>
                    <td>
                      <span className={`badge ${b.isActive ? 'badge-off' : 'badge-ok'}`}>
                        {b.isActive ? 'محظور' : 'مرفوع'}
                      </span>
                    </td>
                    <td className="space-x-1 space-x-reverse">
                      {b.isActive ? (
                        <button
                          type="button"
                          className="btn-teal text-xs !py-1.5 !px-3 inline-flex items-center gap-1"
                          onClick={() => unban(b._id, b.fingerprint.slice(0, 12))}
                        >
                          <Unlock size={13} />
                          رفع الحظر
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
      ) : tab === 'attempts' ? (
        <div className="table-wrap">
          {!attempts.length ? (
            <p className="empty-state">
              لا محاولات بعد — عندما يحاول جهاز محظور فتح الموقع أو استدعاء الـ API تظهر هنا فوراً
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>البصمة</th>
                  <th>IP</th>
                  <th>المصدر</th>
                  <th>المسار</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => {
                  const ban = bannedMap.get(a.fingerprint);
                  return (
                    <tr key={a._id}>
                      <td className="text-xs text-[var(--muted)] whitespace-nowrap">
                        {a.attemptedAt ? new Date(a.attemptedAt).toLocaleString('ar') : '—'}
                      </td>
                      <td
                        className="font-mono text-[11px] max-w-[120px] truncate"
                        dir="ltr"
                        title={a.fingerprint}
                      >
                        {a.fingerprint}
                      </td>
                      <td className="text-xs" dir="ltr">
                        {a.ip || '—'}
                      </td>
                      <td>
                        <span className="badge badge-off">{a.source || 'check'}</span>
                      </td>
                      <td className="text-[11px] text-[var(--muted)] max-w-[140px] truncate" dir="ltr">
                        {a.path || '—'}
                      </td>
                      <td>
                        {ban ? (
                          <button
                            type="button"
                            className="btn-teal text-xs !py-1.5 !px-3 inline-flex items-center gap-1"
                            onClick={() => unban(ban._id)}
                          >
                            <Unlock size={13} />
                            رفع الحظر
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">مرفوع مسبقاً</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          {!visits.length ? (
            <p className="empty-state">لا زيارات بعد</p>
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
                {visits.map((v) => {
                  const ban = bannedMap.get(v.fingerprint);
                  return (
                    <tr key={v._id}>
                      <td
                        className="font-mono text-[11px] max-w-[140px] truncate"
                        dir="ltr"
                        title={v.fingerprint}
                      >
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
                        {ban ? (
                          <button
                            type="button"
                            className="btn-teal text-xs !py-1.5 !px-3 inline-flex items-center gap-1"
                            onClick={() => unban(ban._id)}
                          >
                            <Unlock size={13} />
                            رفع الحظر
                          </button>
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
