'use client';

import Link from 'next/link';
import { useId, useState, type ReactElement } from 'react';
import { accuracyPercent, HEAT_CLASSES, heatLevel, HEAT_LEVELS } from '@/components/data/heat';
import { cn } from '@/lib/cn';

/**
 * The two axes, mirrored from `MASTERY_DIMENSIONS` in the progress domain.
 *
 * Restated here rather than imported because `components` may not reach into
 * `domain` — the lint boundary is the point, not an obstacle. It is a two-value
 * union over a database check constraint; a server that sends a third value has
 * a bug the matrix cannot paper over.
 */
export const MATRIX_DIMENSIONS = Object.freeze(['phoneme', 'rule_family'] as const);

export type MatrixDimension = (typeof MATRIX_DIMENSIONS)[number];

export interface IMasteryMatrixCell {
  readonly dimensionId: string;
  /** The IPA symbol, or the rule family's code. What the learner recognises. */
  readonly label: string;
  readonly attempts: number;
  readonly correct: number;
  /** 0..1. The server computes it; the matrix never divides. */
  readonly accuracy: number;
  readonly isWeakness: boolean;
  /** Where the drill action goes. Built by the caller, never assembled here. */
  readonly drillHref: string;
}

export interface IMasteryMatrixProps {
  readonly dimension: MatrixDimension;
  readonly cells: readonly IMasteryMatrixCell[];
  readonly drillLabel: string;
  readonly className?: string;
}

/**
 * 11 columns for the 44 phonemes, 6 for the 24 rule families — both four rows
 * deep, so the two matrices are the same height on `/progress` where they sit
 * side by side.
 */
const COLUMNS: Readonly<Record<MatrixDimension, number>> = {
  phoneme: 11,
  rule_family: 6,
};

const LEGEND: readonly string[] = ['0', '40', '60', '75', '90'];

function cellTitle(cell: IMasteryMatrixCell): string {
  if (cell.attempts === 0) {
    return `${cell.label} — not yet attempted`;
  }

  const percent = accuracyPercent(cell.accuracy) ?? 0;
  return `${cell.label} — ${String(percent)}% (${String(cell.correct)}/${String(cell.attempts)})`;
}

/**
 * One component, two dimensions — `12-design-system.md` is explicit that two
 * components would drift within a month.
 *
 * A cell is a real `<button>`, so the whole grid is reachable with Tab and
 * operated with Enter or Space; selecting one opens the detail row beneath with
 * the numbers and the drill link. The detail row rather than a floating
 * tooltip, because a tooltip that carries the only route to the drill action is
 * a control a keyboard cannot reach and a touch device cannot open.
 *
 * `title` still carries the same text for a pointer, and `aria-label` carries it
 * for a screen reader. A weakness also takes a `tertiary-500` ring, so "you are
 * weak here" survives a greyscale print and the commonest colour blindness.
 */
export function MasteryMatrix({
  dimension,
  cells,
  drillLabel,
  className,
}: IMasteryMatrixProps): ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailId = useId();
  const selected = cells.find((cell) => cell.dimensionId === selectedId) ?? null;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${String(COLUMNS[dimension])}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => {
          const level = heatLevel(cell.attempts === 0 ? null : cell.accuracy);
          const title = cellTitle(cell);

          return (
            <button
              aria-controls={detailId}
              aria-label={title}
              aria-pressed={selectedId === cell.dimensionId}
              className={cn(
                'flex h-8 items-center justify-center border font-mono text-[11px] leading-none',
                HEAT_CLASSES[level],
                cell.attempts === 0 ? 'border-dashed border-cold' : 'border-hairline',
                cell.isWeakness && 'ring-1 ring-inset ring-tertiary-500',
                selectedId === cell.dimensionId && 'ring-2 ring-primary-900 ring-offset-1',
              )}
              key={cell.dimensionId}
              onClick={() => {
                setSelectedId((current) => (current === cell.dimensionId ? null : cell.dimensionId));
              }}
              title={title}
              type="button"
            >
              {cell.label}
            </button>
          );
        })}
      </div>

      {/*
        The legend is the thresholds in `heat.ts`, written out. A five-step ramp
        with no scale beside it is decoration; with the numbers it is a reading.
      */}
      <div className="flex items-center gap-2">
        <span className="label">Accuracy</span>
        <span className="flex items-center gap-0.5">
          {HEAT_LEVELS.map((level) => (
            <span
              className={cn('num flex h-4 w-8 items-center justify-center', HEAT_CLASSES[level])}
              key={level}
            >
              {LEGEND[level]}
            </span>
          ))}
        </span>
        <span className="num text-[11px] text-muted">%</span>
      </div>

      <div aria-live="polite" className="min-h-[3.5rem]" id={detailId}>
        {selected === null ? (
          <p className="text-muted">Select a cell for its numbers and a drill.</p>
        ) : (
          <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-3">
            <span className="font-mono font-medium text-primary-900">{selected.label}</span>
            <span className="num text-muted">
              {selected.attempts === 0
                ? 'not yet attempted'
                : `${String(accuracyPercent(selected.accuracy) ?? 0)}% · ${String(selected.correct)}/${String(selected.attempts)}`}
            </span>
            {selected.isWeakness && (
              <span className="rounded-chip bg-tertiary-100 px-1.5 py-0.5 text-[11px] text-tertiary-700">
                Weakness
              </span>
            )}
            <Link
              className="ml-auto rounded-control bg-primary-900 px-3 py-1.5 text-surface"
              href={selected.drillHref}
            >
              {drillLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
