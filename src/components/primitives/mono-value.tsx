import { type ReactElement } from 'react';
import { cn } from '@/lib/cn';

export interface IMonoValueProps {
  /** Pre-formatted. This primitive never rounds, never divides, never localises. */
  readonly value: string | number;
  /** `%`, `s`, `×`, `days` — rendered muted and a size down, never as part of the number. */
  readonly unit?: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

const SIZES: Readonly<Record<'sm' | 'md' | 'lg', string>> = {
  sm: 'text-[11px]',
  md: 'text-base',
  lg: 'text-2xl',
};

/**
 * Every number the learner reads goes through here.
 *
 * `font-variant-numeric: tabular-nums` via the `.num` class, because a digit
 * that changes width as it ticks is the fastest way to make an instrument feel
 * cheap — `12-design-system.md` says so in as many words, and a countdown or a
 * live accuracy is exactly where it shows.
 *
 * The unit is a separate span so it stays out of the tabular run: `92` and `%`
 * in one mono string would give the percent sign a digit's width.
 */
export function MonoValue({ value, unit, size = 'md', className }: IMonoValueProps): ReactElement {
  return (
    <span className={cn('num inline-flex items-baseline gap-0.5', SIZES[size], className)}>
      {value}
      {unit !== undefined && <span className="font-sans text-[0.75em] text-muted">{unit}</span>}
    </span>
  );
}
