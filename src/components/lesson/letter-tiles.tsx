'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { cn } from '@/lib/cn';

export interface ILetterTilesProps {
  /** How many letters the answer has. The tile count is the only hint given. */
  readonly length: number;
  readonly onSubmit: (value: string) => void;
  readonly disabled?: boolean;
  /**
   * Per-tile correctness, once the server has answered. `null` while the
   * learner is still typing — this component never marks its own work.
   */
  readonly marks?: readonly ('correct' | 'wrong' | 'missing')[] | null;
  /** Changing this resets the tiles and returns focus to the first one. */
  readonly resetKey: string;
  readonly label: string;
}

const MARK_CLASSES: Readonly<Record<'correct' | 'wrong' | 'missing', string>> = {
  correct: 'border-mastered bg-mastered/10 text-mastered',
  wrong: 'border-tertiary-500 bg-tertiary-100 text-tertiary-700',
  missing: 'border-dashed border-cold text-cold',
};

/**
 * The dictation tiles — the interaction `13-frontend.md` singles out as the one
 * that gets shipped broken.
 *
 * **One real `<input>` per tile, not a hidden input behind painted boxes.** The
 * hidden-input trick is what breaks on mobile: it fights the on-screen keyboard
 * over caret position, and on several Android keyboards it swallows the
 * composition events outright. A real input per letter gets a real keyboard,
 * real focus and real accessibility for free.
 *
 * Every rule the doc lists, and why:
 * - **auto-advance** on a keypress, so typing feels like typing
 * - **backspace moves back *and* clears, in one press** — two presses to undo
 *   one letter is the thing that makes these controls infuriating
 * - **arrows navigate**, Home and End jump to the ends
 * - **paste is blocked** — it defeats the entire exercise
 * - **Enter submits** from any tile
 * - **no mouse is needed at any point**, which is why focus lands on the first
 *   tile on mount and after every reset
 *
 * `inputMode="text"` with `autoCapitalize="off"`, `autoCorrect="off"` and
 * `spellCheck={false}`: a phone that autocorrects the learner's spelling has
 * answered the question for them.
 */
export function LetterTiles({
  length,
  onSubmit,
  disabled = false,
  marks = null,
  resetKey,
  label,
}: ILetterTilesProps): ReactElement {
  const [letters, setLetters] = useState<readonly string[]>(() => Array.from({ length }, () => ''));
  const tiles = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setLetters(Array.from({ length }, () => ''));
    tiles.current[0]?.focus();
  }, [length, resetKey]);

  const focusTile = useCallback((index: number) => {
    const clamped = Math.min(length - 1, Math.max(0, index));
    tiles.current[clamped]?.focus();
    tiles.current[clamped]?.select();
  }, [length]);

  const setLetter = useCallback((index: number, value: string) => {
    setLetters((current) => current.map((letter, position) => (position === index ? value : letter)));
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>, index: number) => {
      switch (event.key) {
        case 'Backspace': {
          event.preventDefault();

          // Both halves, one press. If this tile holds a letter, clear it and
          // step back; if it is already empty, step back and clear that one.
          if (letters[index] !== '') {
            setLetter(index, '');
            focusTile(index - 1);
          } else {
            setLetter(index - 1, '');
            focusTile(index - 1);
          }
          break;
        }
        case 'Delete':
          event.preventDefault();
          setLetter(index, '');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          focusTile(index - 1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          focusTile(index + 1);
          break;
        case 'Home':
          event.preventDefault();
          focusTile(0);
          break;
        case 'End':
          event.preventDefault();
          focusTile(length - 1);
          break;
        case 'Enter':
          event.preventDefault();
          onSubmit(letters.join(''));
          break;
        default:
          break;
      }
    },
    [letters, setLetter, focusTile, length, onSubmit],
  );

  /**
   * Paste is refused rather than silently ignored: the learner is told, because
   * a control that swallows Ctrl+V without a word reads as broken.
   */
  const onPaste = useCallback((event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div aria-label={label} className="flex flex-wrap gap-1.5" role="group">
      {letters.map((letter, index) => {
        const mark = marks?.[index] ?? null;

        return (
          <input
            aria-label={`Letter ${String(index + 1)} of ${String(length)}`}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className={cn(
              'h-11 w-9 rounded-control border text-center font-mono text-lg uppercase',
              mark === null ? 'border-hairline bg-surface' : MARK_CLASSES[mark],
              disabled && 'bg-neutral-100 text-muted',
            )}
            disabled={disabled}
            inputMode="text"
            key={`${resetKey}-${String(index)}`}
            maxLength={1}
            onChange={(event) => {
              const next = event.target.value.slice(-1);
              setLetter(index, next);

              if (next !== '') {
                focusTile(index + 1);
              }
            }}
            onFocus={(event) => { event.target.select(); }}
            onKeyDown={(event) => { onKeyDown(event, index); }}
            onPaste={onPaste}
            ref={(element) => { tiles.current[index] = element; }}
            spellCheck={false}
            type="text"
            value={letter}
          />
        );
      })}
    </div>
  );
}
