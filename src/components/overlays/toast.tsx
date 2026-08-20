'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Glyph } from '@/components/icons/glyph';
import { cn } from '@/lib/cn';

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
const SEVERITY_CLASSES: Readonly<Record<IToast['severity'], string>> = {
  info: 'border-hairline',
  success: 'border-l-2 border-l-mastered',
  warning: 'border-l-2 border-l-secondary-500',
  critical: 'border-l-2 border-l-tertiary-500',
};

/** The word beside the accent, because the accent alone is a colour-only cue. */
const SEVERITY_WORDS: Readonly<Record<IToast['severity'], string>> = {
  info: 'Note',
  success: 'Done',
  warning: 'Warning',
  critical: 'Problem',
};

export function ToastProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [toasts, setToasts] = useState<readonly IToast[]>([]);

  const show = useCallback((toast: Omit<IToast, 'id'>) => {
    const id = `${String(Date.now())}-${String(Math.random())}`;

    setToasts((current) => [...current, { ...toast, id }]);

    setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, DISMISS_AFTER_MS);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2"
      >
        {toasts.map((toast) => (
          <article
            className={cn(
              'pointer-events-auto flex gap-3 rounded-card border bg-surface px-3 py-2.5 shadow-lg',
              SEVERITY_CLASSES[toast.severity],
            )}
            key={toast.id}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-primary-900">
                <span className="label mr-1.5">{SEVERITY_WORDS[toast.severity]}</span>
                {toast.title}
              </p>
              <p className="mt-1 text-neutral-700">{toast.body}</p>
            </div>

            {/*
              A dismiss button, not only a timeout: six seconds is a guess about
              reading speed, and a learner who has read it should not have to
              wait out the rest of somebody's guess.
            */}
            <button
              aria-label="Dismiss"
              className="h-6 w-6 shrink-0 rounded-full text-muted hover:bg-primary-50"
              onClick={() => { dismiss(toast.id); }}
              type="button"
            >
              <Glyph className="mx-auto" name="close" size={14} />
            </button>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
