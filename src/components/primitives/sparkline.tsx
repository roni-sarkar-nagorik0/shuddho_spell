import { type ReactElement } from 'react';
import { cn } from '@/lib/cn';

export interface ISparklineProps {
  /** In order, oldest first. Fewer than two points renders the empty rule. */
  readonly values: readonly number[];
  /** Read instead of the drawing. Required — an unlabelled chart is decoration. */
  readonly label: string;
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
}

interface IScale {
  readonly min: number;
  readonly span: number;
}

function scaleOf(values: readonly number[]): IScale {
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series has zero span; dividing by it would put every point at NaN.
  // Drawing it down the middle is the honest picture of "this did not move".
  return { min, span: max - min === 0 ? 1 : max - min };
}

/**
 * A trend, small enough to sit inside a table row.
 *
 * No axes, no gridlines, no tooltip — a sparkline is the *shape* of a series
 * and anything precise belongs in the column beside it. The last point takes a
 * dot because "where it ended" is the one value a reader looks for.
 *
 * `role="img"` with the label as the accessible name: the polyline is
 * meaningless to a screen reader, so the caller states the reading in words.
 * `vector-effect` keeps the stroke 1.5px however the box is scaled.
 */
export function Sparkline({
  values,
  label,
  width = 96,
  height = 24,
  className,
}: ISparklineProps): ReactElement {
  if (values.length < 2) {
    return (
      <span
        aria-label={`${label}: not enough data`}
        className={cn('inline-block border-b border-dashed border-cold', className)}
        role="img"
        style={{ width, height }}
        title={`${label}: not enough data`}
      />
    );
  }

  const { min, span } = scaleOf(values);
  const step = width / (values.length - 1);
  const y = (value: number): number => height - ((value - min) / span) * height;

  const points = values.map((value, index) => `${String(index * step)},${String(y(value))}`);
  const last = values[values.length - 1] ?? 0;

  return (
    <svg
      aria-label={label}
      className={cn('overflow-visible', className)}
      height={height}
      role="img"
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      width={width}
    >
      <polyline
        fill="none"
        points={points.join(' ')}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={width} cy={y(last)} fill="currentColor" r={2} />
    </svg>
  );
}
