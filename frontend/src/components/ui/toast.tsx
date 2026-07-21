'use client';

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastContextValue {
  push: (kind: ToastKind, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => [...prev.slice(-4), { id, kind, title, description }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed z-[100] bottom-4 inset-x-4 sm:inset-x-auto sm:start-4 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto surface-card px-4 py-3 shadow-lg border text-sm max-w-sm animate-rise ${
              t.kind === 'success'
                ? 'border-[var(--teal)]/40'
                : t.kind === 'error'
                  ? 'border-[var(--orange)]/50'
                  : 'border-[var(--border)]'
            }`}
            role="status"
          >
            <p
              className={`font-bold m-0 ${
                t.kind === 'success'
                  ? 'text-[var(--teal-dark)]'
                  : t.kind === 'error'
                    ? 'text-[var(--orange-dark)]'
                    : ''
              }`}
            >
              {t.title}
            </p>
            {t.description ? (
              <p className="text-xs text-[var(--muted)] m-0 mt-1">{t.description}</p>
            ) : null}
            <button
              type="button"
              className="text-[10px] text-[var(--muted)] mt-2 hover:underline"
              onClick={() => dismiss(t.id)}
            >
              إغلاق
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => undefined,
      success: () => undefined,
      error: () => undefined,
      info: () => undefined,
    } satisfies ToastContextValue;
  }
  return ctx;
}
