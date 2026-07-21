'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getDeviceFingerprint, clearAuthButKeepDeviceBanMarker } from '@/lib/device';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function DeviceAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(pathname === '/blocked');

  useEffect(() => {
    if (pathname === '/blocked') {
      setReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const fingerprint = await getDeviceFingerprint();
        if (!fingerprint) {
          if (!cancelled) setReady(true);
          return;
        }

        const res = await fetch(`${API_URL}/devices/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-device-fingerprint': fingerprint },
          body: JSON.stringify({
            fingerprint,
            userAgent: navigator.userAgent,
            meta: {
              lang: navigator.language,
              tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
              screen: `${screen.width}x${screen.height}`,
            },
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (data.banned || data.code === 'DEVICE_BANNED') {
          clearAuthButKeepDeviceBanMarker();
          router.replace('/blocked');
          return;
        }
        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="app-shell flex items-center justify-center p-6">
        <div className="animate-pulse text-[var(--muted)] text-sm">جاري التحقق من الجهاز...</div>
      </div>
    );
  }

  return <>{children}</>;
}
