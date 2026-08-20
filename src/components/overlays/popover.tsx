'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useDismissable } from './use-dismissable';

export interface IPopoverProps {
  /** Rendered as the trigger's content. The trigger itself is this component's button. */
  readonly trigger: ReactNode;
  readonly triggerLabel: string;
  readonly children: ReactNode;
  readonly align?: 'left' | 'right';
  readonly className?: string;
}

/**
 * Non-modal: the page behind it stays live, Escape closes it, clicking outside
 * closes it, and tabbing past its last control closes it rather than trapping.
 *
 * A shadow is allowed here. `12-design-system.md` permits exactly three of them
 * — popover, drawer, dialog — because an overlay is the one case where a
 * hairline cannot say "this floats above the page".
 */
export function Popover({
  trigger,
  triggerLabel,
  children,
  align = 'left',
  className,
}: IPopoverProps): ReactElement {
  const [open, setOpen] = useState(false);
  const surface = useRef<HTMLDivElement | null>(null);
  const wrapper = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const close = useCallback(() => { setOpen(false); }, []);
  useDismissable(surface, { open, onClose: close, trap: false });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && wrapper.current?.contains(event.target) !== true) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => { document.removeEventListener('pointerdown', onPointerDown); };
  }, [open]);

  return (
    <div className="relative" ref={wrapper}>
      <button
        aria-controls={open ? panelId : undefined}
        aria-expanded={open}
        aria-label={triggerLabel}
        className="flex h-8 items-center justify-center rounded-control px-2 hover:bg-primary-50"
        onClick={() => { setOpen((current) => !current); }}
        type="button"
      >
        {trigger}
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-40 mt-1 min-w-64 rounded-card border border-hairline bg-surface p-3 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
          id={panelId}
          ref={surface}
          tabIndex={-1}
        >
          {children}
        </div>
      )}
    </div>
  );
}
