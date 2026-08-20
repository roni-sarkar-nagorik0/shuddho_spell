import { type ReactElement } from 'react';
import { MonoValue } from '@/components/primitives/mono-value';
import { cn } from '@/lib/cn';

export interface IStatCellProps {
  readonly label: string;
  readonly value: string | number;
  readonly unit?: string;
  /** A second line under the value — "3 due today", "up 4 since Monday". */
  readonly note?: string;
  /** Signed change. `null` when there is nothing to compare against yet. */
  readonly delta?: number | null;
  readonly className?: string;
}

/**
 * One number with its label — the unit the dashboard's stat panels are built
 * from.
 *
 * The delta carries an arrow *and* a sign *and* a colour. Colour alone would be
 * the failure `12-design-system.md` calls out by name: green-against-amber is
 * the pair that disappears for the commonest colour blindness, and "did I
 * improve" is not a question to answer with hue.
 */
export function StatCell({
  label,
  value,
  unit,
  note,
  delta,
  className,
}: IStatCellProps): ReactElement {
  const rising = delta !== undefined && delta !== null && delta > 0;
  const falling = delta !== undefined && delta !== null && delta < 0;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="label">{label}</span>

      <span className="flex items-baseline gap-2">
        {/*
          `exactOptionalPropertyTypes` is on, so an absent unit is spread away
          rather than passed as `undefined`. Widening `IMonoValueProps.unit` to
          `string | undefined` would have been the smaller edit and the wrong
          one — it makes "no unit" and "explicitly undefined" the same value at
          every other call site too.
        */}
        <MonoValue size="lg" value={value} {...(unit === undefined ? {} : { unit })} />

        {(rising || falling) && (
          <span
            className={cn(
              'num text-[11px]',
              rising ? 'text-mastered' : 'text-tertiary-500',
            )}
          >
            {rising ? '▲' : '▼'} {Math.abs(delta)}
          </span>
        )}
      </span>

      {note !== undefined && <span className="text-[11px] text-muted">{note}</span>}
    </div>
  );
}
