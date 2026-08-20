'use client';

import { useId, useRef, type ReactElement } from 'react';
import { cn } from '@/lib/cn';
import { useDismissable } from './use-dismissable';

export interface IConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  /** One sentence saying what will happen. Never "Are you sure?" on its own. */
  readonly body: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  /** Destructive confirms are `tertiary-500`; the default is the primary fill. */
  readonly destructive?: boolean;
}

/**
 * The one modal in the product that asks a question.
 *
 * Cancel is focused first, not Confirm. A dialog that opens with the
 * irreversible action under the return key turns a stray keystroke into a
 * submitted exam. Escape does the same as Cancel, deliberately: the safe answer
 * is the one that is easiest to give.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: IConfirmDialogProps): ReactElement | null {
  const surface = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  useDismissable(surface, { open, onClose: onCancel, trap: true });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/20 p-4">
      <div
        aria-describedby={bodyId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-sm rounded-card border border-hairline bg-surface p-4 shadow-2xl"
        ref={surface}
        role="alertdialog"
        tabIndex={-1}
      >
        <h2 className="font-display text-sm tracking-tight text-primary-900" id={titleId}>
          {title}
        </h2>
        <p className="mt-2 text-neutral-700" id={bodyId}>
          {body}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          {/*
            Cancel first in the DOM as well as visually, so it is what
            `useDismissable` focuses on open.
          */}
          <button
            className="h-8 rounded-control border border-primary-900 px-3 text-primary-900"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={cn(
              'h-8 rounded-control px-3 text-surface',
              destructive ? 'bg-tertiary-500' : 'bg-primary-900',
            )}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
