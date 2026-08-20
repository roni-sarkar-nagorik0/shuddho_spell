'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface IToast {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly severity: 'info' | 'success' | 'warning' | 'critical';
}

interface IToastApi {
  readonly show: (toast: Omit<IToast, 'id'>) => void;
}

const ToastContext = createContext<IToastApi | null>(null);

/**
 * Throws outside its provider rather than returning a no-op.
 *
 * The same call `useSession` makes and for the same reason: a toast that
 * silently does nothing is a bug that only shows up as the *absence* of
 * feedback, which nobody notices in review and everybody notices in production.
 */
export function useToast(): IToastApi {
  const api = useContext(ToastContext);

  if (api === null) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }

  return api;
}

/** How long a toast stays. Long enough to read a sentence, short enough not to nag. */
const DISMISS_AFTER_MS = 6000;

/**
 * In-session feedback — the third place a notification can appear, beside the
 * bell and a push.
 *
 * A toast is **never** the only record of anything. Everything shown here has
 * already been written to `notifications`, so a learner who missed it finds it
 * in the bell; a toast that carried information nothing else held would be a
 * message destroyed by a page navigation.
 *
 * `aria-live="polite"` rather than `assertive`: these interrupt a screen reader
 * at the next pause instead of mid-sentence, which is the right manners for
 * something the learner did not ask for.
 */
export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly IToast[]>([]);

  const show = useCallback((toast: Omit<IToast, 'id'>) => {
    const id = `${String(Date.now())}-${String(Math.random())}`;

    setToasts((current) => [...current, { ...toast, id }]);

    setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, DISMISS_AFTER_MS);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 flex w-80 flex-col gap-2"
      >
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className="pointer-events-auto border border-neutral-300 bg-white px-4 py-3 text-sm"
          >
            <p className="font-medium">{toast.title}</p>
            <p className="mt-1">{toast.body}</p>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
