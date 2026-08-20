import { type ReactElement } from 'react';
import { accuracyPercent, HEAT_CLASSES, heatLevel } from '@/components/data/heat';
import { cn } from '@/lib/cn';

export interface IPhonemeCell {
  /** Bare IPA, no delimiters — the strip adds them around the whole line. */
  readonly symbol: string;
  readonly isStressed: boolean;
  /** Which syllable this sound belongs to. A divider is drawn where it changes. */
  readonly syllable: number;
  /** The **learner's** mastery of this sound, 0..1, or null when never attempted. */
  readonly accuracy: number | null;
  readonly attempts: number;
}

export interface IPhonemeStripProps {
  /** The spelling, split at syllable boundaries: `['sub', 'tle']`. */
  readonly syllables: readonly string[];
  readonly cells: readonly IPhonemeCell[];
  /**
   * The Bangla pronunciation line, in **real Bangla script**. `null` when the
   * content team has not written one — the line is then omitted rather than
   * filled with a transliteration, which the standing rule forbids.
   */
  readonly bangla: string | null;
  readonly className?: string;
}

/** The mono stat line's three numbers, computed from the cells rather than passed in. */
interface IStripStats {
  readonly attempts: number;
  readonly accuracy: number | null;
  readonly unseen: number;
}

function summarise(cells: readonly IPhonemeCell[]): IStripStats {
  const attempted = cells.filter((cell) => cell.accuracy !== null && cell.attempts > 0);
  const attempts = attempted.reduce((total, cell) => total + cell.attempts, 0);

  // Weighted by attempts: a sound tried forty times should not be averaged
  // level with one tried twice.
  const correct = attempted.reduce(
    (total, cell) => total + (cell.accuracy ?? 0) * cell.attempts,
    0,
  );

  return {
    attempts,
    accuracy: attempts === 0 ? null : correct / attempts,
    unseen: cells.length - attempted.length,
  };
}

function CellBox({ cell }: { readonly cell: IPhonemeCell }): ReactElement {
  const level = heatLevel(cell.accuracy);
  const percent = accuracyPercent(cell.accuracy);
  const unseen = cell.accuracy === null || cell.attempts === 0;

  // The fill is a colour-only cue on its own, and green-vs-amber is the pair
  // that fails for the commonest colour blindness. The accessible name carries
  // the same fact in words, and the stat line carries it in numbers.
  const label = unseen
    ? `${cell.symbol}, not yet attempted`
    : `${cell.symbol}, ${String(percent)}% over ${String(cell.attempts)} attempts`;

  return (
    <span
      aria-label={label}
      className={cn(
        'flex h-[22px] w-[22px] items-center justify-center border font-mono text-[11px] leading-none',
        HEAT_CLASSES[level],
        unseen ? 'border-dashed border-cold' : 'border-hairline',
        cell.isStressed && 'font-medium ring-1 ring-inset ring-primary-900',
      )}
      role="img"
      title={label}
    >
      {cell.symbol}
    </span>
  );
}

/**
 * The word, its sounds, the Bangla line, the numbers — one of the two
 * components `12-design-system.md` says is built once and appears on nine
 * screens.
 *
 * A Server Component: it has no state, no effect and no handler. The drill
 * action that would make it interactive belongs to the screens that embed it,
 * not to the strip.
 *
 * Cells are 22px, bordered, tinted by the **learner's** mastery of that sound
 * rather than by any property of the sound itself — two learners looking at
 * `subtle` see different strips, which is the entire point of it.
 */
export function PhonemeStrip({
  syllables,
  cells,
  bangla,
  className,
}: IPhonemeStripProps): ReactElement {
  const stats = summarise(cells);
  const percent = accuracyPercent(stats.accuracy);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/*
        Syllable dividers on the spelling are a middle dot between spans, not a
        hyphen: a hyphen is a character a learner might believe belongs in the
        word. `aria-hidden` on the dot keeps the word readable as one word.
      */}
      <p className="flex items-baseline font-display text-lg tracking-tight text-primary-900">
        {syllables.map((syllable, index) => (
          <span className="flex items-baseline" key={`${syllable}-${String(index)}`}>
            {index > 0 && (
              <span aria-hidden="true" className="px-1 text-cold">
                ·
              </span>
            )}
            {syllable}
          </span>
        ))}
      </p>

      <div className="flex flex-wrap items-center gap-1">
        {cells.map((cell, index) => (
          <span className="flex items-center gap-1" key={`${cell.symbol}-${String(index)}`}>
            {index > 0 && cells[index - 1]?.syllable !== cell.syllable && (
              <span aria-hidden="true" className="h-[22px] w-px bg-hairline" />
            )}
            <CellBox cell={cell} />
          </span>
        ))}
      </div>

      {bangla !== null && (
        <p className="font-bengali text-muted" lang="bn">
          {bangla}
        </p>
      )}

      <p className="num flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span>{cells.length} sounds</span>
        <span>{stats.attempts} attempts</span>
        <span>{percent === null ? '—' : `${String(percent)}%`} accuracy</span>
        {stats.unseen > 0 && <span>{stats.unseen} not seen</span>}
      </p>
    </div>
  );
}
