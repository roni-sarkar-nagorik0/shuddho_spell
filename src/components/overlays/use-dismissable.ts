'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableWithin(container: HTMLElement): readonly HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

export interface IDismissableOptions {
  readonly open: boolean;
  readonly onClose: () => void;
  /**
   * `true` for a modal surface — a dialog or a drawer — where Tab must not
   * leave. A popover is non-modal: it closes on Tab-out rather than fighting
   * the user for focus, which is the pattern the ARIA authoring practices give
   * for a popover and the reason the two behaviours share one hook.
   */
  readonly trap: boolean;
}

/**
 * Escape closes, focus goes in, focus comes back — the three things every
 * overlay in this product owes the keyboard, implemented once.
 *
 * The element focused at open time is remembered and restored on close. Without
 * that, dismissing a drawer drops focus onto `<body>` and the next Tab starts
 * from the top of the document — for a learner on a keyboard that is not a
 * rough edge, it is losing their place on the page.
 *
 * The trap is a `keydown` on the container rather than a `focusin` fight with
 * the document: wrapping Tab at the ends of the list is enough, and it leaves
 * programmatic focus (a validation error, a toast) able to move where it needs.
 */
export function useDismissable(
  container: RefObject<HTMLElement | null>,
  { open, onClose, trap }: IDismissableOptions,
): void {
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const element = container.current;
    restoreTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Focus the first thing inside, or the surface itself when it holds no
    // controls — a drawer of text still has to receive focus, or a screen
    // reader carries on reading the page behind it.
    const first = element === null ? undefined : focusableWithin(element)[0];
    (first ?? element)?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || element === null) {
        return;
      }

      const focusable = focusableWithin(element);

      if (!trap) {
        // Non-modal: Tab past either end dismisses instead of cycling.
        const edge = event.shiftKey ? focusable[0] : focusable.at(-1);
        if (focusable.length === 0 || document.activeElement === edge) {
          onClose();
        }
        return;
      }

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const start = focusable[0];
      const end = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === start) {
        event.preventDefault();
        end?.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        start?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      restoreTo.current?.focus();
    };
  }, [open, onClose, trap, container]);
}
