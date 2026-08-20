import { type ReactElement } from 'react';
import { accuracyPercent, HEAT_CLASSES, heatLevel } from '@/components/data/heat';
import { cn } from '@/lib/cn';

export interface IHeatCellProps {
  /** 0..1, or `null` for never attempted — drawn dashed, not merely pale. */
  readonly accuracy: number | null;
  /** What the cell stands for: an IPA symbol, a rule code, a date. */
  readonly label: string;
  /** Shown inside the cell. Omit for a bare square, as the activity heatmap uses. */
  readonly children?: string;
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

/**
 * One square of any heatmap — the activity grid, the by-skill breakdown, a
 * single sound on a result page.
 *
 * Always carries its value in words in the accessible name. The heat scale is
 * never allowed to be the only signal.
 */
export function HeatCell({
  accuracy,
  label,
  children,
  size = 'md',
  className,
}: IHeatCellProps): ReactElement {
  const percent = accuracyPercent(accuracy);
  const description =
    percent === null ? `${label}: not yet attempted` : `${label}: ${String(percent)}%`;

  return (
    <span
      aria-label={description}
      className={cn(
        'inline-flex items-center justify-center border font-mono leading-none',
        size === 'sm' ? 'h-3.5 w-3.5 text-[9px]' : 'h-[22px] w-[22px] text-[11px]',
        HEAT_CLASSES[heatLevel(accuracy)],
        accuracy === null ? 'border-dashed border-cold' : 'border-hairline',
        className,
      )}
      role="img"
      title={description}
    >
      {children}
    </span>
  );
}
