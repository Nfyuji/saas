const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function deviceFingerprintHeader(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') return {};
  try {
    const { getDeviceFingerprint } = await import('./device');
    const fp = await getDeviceFingerprint();
    return fp ? { 'x-device-fingerprint': fp } : {};
  } catch {
    return {};
  }
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const deviceHeaders = await deviceFingerprintHeader();
    const headers: Record<string, string> = {
      ...deviceHeaders,
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      const code = data.code || data.message?.code;
      const msg =
        (typeof data.message === 'object' ? data.message?.message : data.message) ||
        data.error ||
        'ممنوع';
      if (code === 'DEVICE_BANNED' || String(msg).includes('حظر هذا الجهاز')) {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/blocked')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/blocked';
        }
      }
      throw new Error(Array.isArray(msg) ? msg.join(' · ') : String(msg));
    }

    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      const msg = data.message || 'غير مصرح';
      const isLogin = path.includes('/auth/login') || path.includes('/auth/register');
      if (!isLogin && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new Error(Array.isArray(msg) ? msg.join(' · ') : String(msg));
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = data.message || data.error || 'حدث خطأ';
      throw new Error(Array.isArray(raw) ? raw.join(' · ') : String(raw));
    }
    return data as T;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
