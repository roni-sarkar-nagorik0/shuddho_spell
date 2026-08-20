'use client';

import { useCallback, useEffect, useRef, type KeyboardEvent, type ReactElement } from 'react';
import { cn } from '@/lib/cn';

export const NAVIGATOR_STATES = Object.freeze(['current', 'answered', 'flagged', 'blank'] as const);

export type NavigatorState = (typeof NAVIGATOR_STATES)[number];

export interface INavigatorEntry {
  readonly questionId: string;
  readonly answered: boolean;
  readonly flagged: boolean;
}

export interface IQuestionNavigatorProps {
  readonly entries: readonly INavigatorEntry[];
  readonly currentIndex: number;
  readonly onJump: (index: number) => void;
  /** Columns in the grid. Ten keeps a 150-question paper to fifteen rows. */
  readonly columns?: number;
}

const STATE_CLASSES: Readonly<Record<NavigatorState, string>> = {
  current: 'bg-surface text-primary-900 ring-2 ring-secondary-500',
  answered: 'bg-primary-100 text-primary-900',
  flagged: 'bg-secondary-500 text-primary-900',
  blank: 'border border-primary-700 text-primary-100',
};

const STATE_WORDS: Readonly<Record<NavigatorState, string>> = {
  current: 'current question',
  answered: 'answered',
  flagged: 'flagged for review',
  blank: 'blank',
};

function stateOf(entry: INavigatorEntry, isCurrent: boolean): NavigatorState {
  if (isCurrent) {
    return 'current';
  }

  // Flagged outranks answered: a learner flags a question they answered but
  // want to revisit, and hiding the flag under "answered" loses the only reason
  // they marked it.
  if (entry.flagged) {
    return 'flagged';
  }

  return entry.answered ? 'answered' : 'blank';
}

/**
 * Where the learner is in the section, and everywhere they can go.
 *
 * **Four states, each carrying a word as well as a fill.** A grid of coloured
 * squares is exactly the control that fails in greyscale and for the commonest
 * colour blindness, so every cell's accessible name ends in "answered",
 * "flagged for review", "blank" or "current question", and a flagged cell also
 * takes a corner mark.
 *
 * **Fully keyboard operable**, with roving focus: one cell is tabbable, arrows
 * move within the grid, Home and End go to the ends, and Enter or Space jumps.
 * Tab therefore steps past the navigator to the paper rather than through 150
 * buttons — which is what makes a long paper navigable without a mouse.
 */
export function QuestionNavigator({
  entries,
  currentIndex,
  onJump,
  columns = 10,
}: IQuestionNavigatorProps): ReactElement {
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIndex = useRef(currentIndex);
  const shouldFocus = useRef(false);

  useEffect(() => {
    if (shouldFocus.current) {
      shouldFocus.current = false;
      cells.current[focusIndex.current]?.focus();
    }
  });

  const move = useCallback(
    (delta: number) => {
      const next = Math.min(entries.length - 1, Math.max(0, focusIndex.current + delta));
      focusIndex.current = next;
      shouldFocus.current = true;
      cells.current[next]?.focus();
    },
    [entries.length],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case 'ArrowRight':
          move(1);
          break;
        case 'ArrowLeft':
          move(-1);
          break;
        case 'ArrowDown':
          move(columns);
          break;
        case 'ArrowUp':
          move(-columns);
          break;
        case 'Home':
          move(-entries.length);
          break;
        case 'End':
          move(entries.length);
          break;
        default:
          return;
      }

      event.preventDefault();
    },
    [move, columns, entries.length],
  );

  return (
    <nav aria-label="Questions in this section">
      <div
        className="grid gap-1"
        onKeyDown={onKeyDown}
        style={{ gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))` }}
      >
        {entries.map((entry, index) => {
          const state = stateOf(entry, index === currentIndex);

          return (
            <button
              aria-current={index === currentIndex ? 'true' : undefined}
              aria-label={`Question ${String(index + 1)}, ${STATE_WORDS[state]}`}
              className={cn(
                'relative h-7 rounded-control font-mono text-[11px] tabular-nums',
                STATE_CLASSES[state],
              )}
              key={entry.questionId}
              onClick={() => {
                focusIndex.current = index;
                onJump(index);
              }}
              ref={(element) => { cells.current[index] = element; }}
              tabIndex={index === focusIndex.current ? 0 : -1}
              type="button"
            >
              {index + 1}
              {entry.flagged && (
                // A corner mark as well as the fill, so the flag survives
                // greyscale and a colour-blind reader.
                <span
                  aria-hidden="true"
                  className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-tertiary-500"
                />
              )}
            </button>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-primary-100">
        {NAVIGATOR_STATES.map((state) => (
          <li className="flex items-center gap-1.5" key={state}>
            <span className={cn('h-3 w-3 rounded-sm', STATE_CLASSES[state])} />
            {STATE_WORDS[state]}
          </li>
        ))}
      </ul>
    </nav>
  );
}
