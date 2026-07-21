const STORAGE_KEY = 'bos_device_fp';

function canvasSignal(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(10, 8, 120, 30);
    ctx.fillStyle = '#069';
    ctx.fillText('BusinessOS·device', 12, 12);
    ctx.strokeStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(180, 30, 18, 0, Math.PI * 2);
    ctx.stroke();
    return canvas.toDataURL().slice(-64);
  } catch {
    return 'canvas-err';
  }
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** بصمة جهاز مستقرة نسبياً (لا تعتمد على IP/VPN) */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return '';

  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached && cached.length >= 16) return cached;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { mobile?: boolean; platform?: string };
  };

  const raw = [
    nav.userAgent,
    nav.language,
    (nav.languages || []).join(','),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(screen.availWidth),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    String(nav.hardwareConcurrency || 0),
    String(nav.deviceMemory || 0),
    nav.platform || '',
    String(nav.maxTouchPoints || 0),
    nav.userAgentData?.platform || '',
    String(nav.userAgentData?.mobile ?? ''),
    canvasSignal(),
  ].join('|');

  const hex = await sha256Hex(raw);
  const fp = `bos_${hex.slice(0, 40)}`;
  localStorage.setItem(STORAGE_KEY, fp);
  try {
    document.cookie = `bos_fp=${fp};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
  return fp;
}

export function clearAuthButKeepDeviceBanMarker() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
