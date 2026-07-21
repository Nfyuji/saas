/**
 * API Client موحّد — Fetch + JWT + بصمة الجهاز + Abort + Timeout
 * كل الخدمات والـ Hooks تعتمد عليه.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[]>;
  raw?: unknown;

  constructor(
    message: string,
    status: number,
    opts?: { code?: string; errors?: Record<string, string[]>; raw?: unknown },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = opts?.code;
    this.errors = opts?.errors;
    this.raw = opts?.raw;
  }
}

export type RequestOptions = RequestInit & {
  /** مهلة الطلب بالميلي ثانية (افتراضي 60s) */
  timeoutMs?: number;
  /** لا تُضف Content-Type JSON (للملفات) */
  skipJsonContentType?: boolean;
};

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

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function parseMessage(data: Record<string, unknown>): string {
  const msg = data.message ?? data.error ?? 'حدث خطأ';
  if (typeof msg === 'object' && msg && 'message' in (msg as object)) {
    return String((msg as { message?: string }).message || 'حدث خطأ');
  }
  if (Array.isArray(msg)) return msg.join(' · ');
  return String(msg);
}

class ApiClient {
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { timeoutMs = 60_000, skipJsonContentType, signal, ...init } = options;
    const token = getToken();
    const deviceHeaders = await deviceFingerprintHeader();

    const headers: Record<string, string> = {
      ...deviceHeaders,
      ...(init.headers as Record<string, string>),
    };

    const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
    if (!isForm && !skipJsonContentType && !(headers['Content-Type'] || headers['content-type'])) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (res.status === 403) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const code =
          (data.code as string) ||
          (typeof data.message === 'object'
            ? (data.message as { code?: string })?.code
            : undefined);
        const msg = parseMessage(data);
        if (code === 'DEVICE_BANNED' || msg.includes('حظر هذا الجهاز')) {
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/blocked')) {
            clearSession();
            window.location.href = '/blocked';
          }
        }
        throw new ApiError(msg, 403, { code, raw: data });
      }

      if (res.status === 401) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const msg = parseMessage(data) || 'غير مصرح';
        const isAuth =
          path.includes('/auth/login') ||
          path.includes('/auth/register') ||
          path.includes('/auth/forgot') ||
          path.includes('/auth/reset');
        if (!isAuth && typeof window !== 'undefined') {
          clearSession();
          window.location.href = '/login';
        }
        throw new ApiError(msg, 401, { raw: data });
      }

      if (res.status === 404) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        throw new ApiError(parseMessage(data) || 'غير موجود', 404, { raw: data });
      }

      if (res.status === 422) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const errors = (data.errors || data.message) as Record<string, string[]> | undefined;
        throw new ApiError(parseMessage(data) || 'بيانات غير صالحة', 422, {
          errors: typeof errors === 'object' && !Array.isArray(errors) ? errors : undefined,
          raw: data,
        });
      }

      if (res.status >= 500) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        throw new ApiError(parseMessage(data) || 'خطأ في الخادم', res.status, { raw: data });
      }

      if (res.status === 204) return undefined as T;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new ApiError(parseMessage(data as Record<string, unknown>), res.status, { raw: data });
      }
      return data as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if ((e as Error)?.name === 'AbortError') {
        throw new ApiError('تم إلغاء الطلب', 0, { code: 'ABORTED' });
      }
      throw new ApiError((e as Error)?.message || 'فشل الاتصال بالخادم', 0, { code: 'NETWORK' });
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  }

  get<T>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: isForm || body === undefined ? (body as BodyInit) : JSON.stringify(body),
    });
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: isForm || body === undefined ? (body as BodyInit) : JSON.stringify(body),
    });
  }

  delete<T>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
