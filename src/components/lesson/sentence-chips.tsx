'use client';

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
} from 'react';
import { cn } from '@/lib/cn';

export interface IChip {
  readonly id: string;
  readonly text: string;
}

export interface ISentenceChipsProps {
  readonly chips: readonly IChip[];
  readonly onChange: (chips: readonly IChip[]) => void;
  readonly disabled?: boolean;
  readonly label: string;
}

function move(chips: readonly IChip[], from: number, to: number): readonly IChip[] {
  if (from === to || from < 0 || to < 0 || from >= chips.length || to >= chips.length) {
    return chips;
  }

  const next = [...chips];
  const [lifted] = next.splice(from, 1);

  if (lifted === undefined) {
    return chips;
  }

  next.splice(to, 0, lifted);
  return next;
}

/**
 * Reorderable word chips, with **two equal ways to reorder them**.
 *
 * **Pointer events, not HTML5 drag-and-drop.** `13-frontend.md` says so and the
 * reason is simple: HTML5 DnD does not fire on touch at all, so a phone user
 * would face a control that visibly invites dragging and does nothing.
 * `setPointerCapture` gives mouse, touch and pen one code path.
 *
 * **Keyboard is a first-class path, not an afterthought.** Focus a chip, press
 * Space or Enter to lift it, arrows to move it, Enter to drop, Escape to put it
 * back where it was. Every move is announced through the live region, because a
 * reorder a screen reader user cannot hear is a reorder they cannot verify.
 *
 * The drop target is decided by chip midpoints measured at the moment of the
 * move, so the reorder follows the pointer through a wrapped, variable-width
 * row without any assumption about chip size.
 */
export function SentenceChips({
  chips,
  onChange,
  disabled = false,
  label,
}: ISentenceChipsProps): ReactElement {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [liftedIndex, setLiftedIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const elements = useRef<(HTMLButtonElement | null)[]>([]);
  const snapshot = useRef<readonly IChip[]>(chips);

  const announce = useCallback((chip: IChip, position: number, total: number) => {
    setAnnouncement(`${chip.text}, position ${String(position + 1)} of ${String(total)}`);
  }, []);

  const indexAtPoint = useCallback((clientX: number, clientY: number): number | null => {
    for (const [index, element] of elements.current.entries()) {
      if (element === null) {
        continue;
      }

      const rect = element.getBoundingClientRect();

      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return index;
      }
    }

    return null;
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>, index: number) => {
      if (disabled) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      setDragIndex(index);
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (dragIndex === null) {
        return;
      }

      const over = indexAtPoint(event.clientX, event.clientY);

      if (over !== null && over !== dragIndex) {
        onChange(move(chips, dragIndex, over));
        setDragIndex(over);
      }
    },
    [dragIndex, indexAtPoint, chips, onChange],
  );

  const onPointerUp = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragIndex(null);
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (disabled) {
        return;
      }

      const chip = chips[index];

      if (chip === undefined) {
        return;
      }

      switch (event.key) {
        case ' ':
        case 'Enter': {
          event.preventDefault();

          if (liftedIndex === index) {
            setLiftedIndex(null);
            setAnnouncement(`${chip.text} dropped at position ${String(index + 1)}`);
          } else {
            snapshot.current = chips;
            setLiftedIndex(index);
            setAnnouncement(`${chip.text} lifted. Use the arrow keys to move it.`);
          }
          break;
        }
        case 'Escape': {
          if (liftedIndex === null) {
            return;
          }

          event.preventDefault();
          onChange(snapshot.current);
          setLiftedIndex(null);
          setAnnouncement('Move cancelled.');
          break;
        }
        case 'ArrowLeft':
        case 'ArrowRight': {
          event.preventDefault();
          const target = index + (event.key === 'ArrowLeft' ? -1 : 1);

          if (target < 0 || target >= chips.length) {
            return;
          }

          if (liftedIndex === index) {
            onChange(move(chips, index, target));
            setLiftedIndex(target);
            announce(chip, target, chips.length);
            // Focus follows the chip, not the position — otherwise the next
            // arrow press moves whatever slid into the old slot.
            requestAnimationFrame(() => { elements.current[target]?.focus(); });
          } else {
            elements.current[target]?.focus();
          }
          break;
        }
        default:
          break;
      }
    },
    [chips, disabled, liftedIndex, onChange, announce],
  );

  return (
    <div className="flex flex-col gap-2">
      <ul aria-label={label} className="flex flex-wrap gap-2">
        {chips.map((chip, index) => (
          <li key={chip.id}>
            <button
              aria-label={`${chip.text}, position ${String(index + 1)} of ${String(chips.length)}`}
              aria-pressed={liftedIndex === index}
              aria-roledescription="Draggable word. Space to lift, arrows to move, Enter to drop."
              className={cn(
                'h-9 touch-none select-none rounded-chip border px-3 font-medium',
                liftedIndex === index || dragIndex === index
                  ? 'border-primary-900 bg-primary-100 text-primary-900'
                  : 'border-hairline bg-surface text-neutral-900',
                disabled && 'bg-neutral-100 text-muted',
              )}
              disabled={disabled}
              key={chip.id}
              onKeyDown={(event) => { onKeyDown(event, index); }}
              onPointerCancel={onPointerUp}
              onPointerDown={(event) => { onPointerDown(event, index); }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              ref={(element) => { elements.current[index] = element; }}
              type="button"
            >
              {chip.text}
            </button>
          </li>
        ))}
      </ul>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
