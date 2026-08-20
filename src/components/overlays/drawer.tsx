'use client';

import { type ReactElement, type ReactNode, useRef } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { cn } from '@/lib/cn';
import { useDismissable } from './use-dismissable';

export interface IDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  /** Right by default — the detail drawer beside a table. */
  readonly side?: 'right' | 'left';
  readonly className?: string;
}

/**
 * The detail surface the library table and the weak-spots list open beside
 * themselves.
 *
 * Modal, so Tab stays inside and the page behind is `aria-hidden` by virtue of
 * the scrim intercepting pointer events. Escape closes it and focus returns to
 * whatever opened it.
 *
 * The transition is behind `motion-safe:`, so a learner who has asked their
 * system for reduced motion gets the drawer without the slide rather than
 * getting no drawer.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  className,
}: IDrawerProps): ReactElement | null {
  const surface = useRef<HTMLDivElement | null>(null);
  useDismissable(surface, { open, onClose, trap: true });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        aria-label="Close"
        className="flex-1 bg-neutral-900/20"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />

      <div
        aria-labelledby="drawer-title"
        aria-modal="true"
        className={cn(
          'flex w-[min(28rem,100vw)] flex-col border-hairline bg-surface shadow-2xl',
          side === 'right' ? 'order-last border-l' : 'order-first border-r',
          'motion-safe:transition-transform',
          className,
        )}
        ref={surface}
        role="dialog"
        tabIndex={-1}
      >
        <header className="flex h-topbar shrink-0 items-center gap-3 border-b border-hairline px-4">
          <h2 className="font-display text-sm tracking-tight text-primary-900" id="drawer-title">
            {title}
          </h2>
          <button
            aria-label="Close"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-primary-50"
            onClick={onClose}
            type="button"
          >
            <Glyph name="close" size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
