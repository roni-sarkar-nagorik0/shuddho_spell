import { type ReactElement } from 'react';
import { cn } from '@/lib/cn';

/**
 * A grey block standing in for something that has not arrived yet.
 *
 * It is deliberately dumb: a shape, a pulse, and nothing that could be mistaken
 * for data. The product's rule that a zero is never rendered as a fact applies
 * here too — a skeleton must not show a plausible number, a name or a streak,
 * because a learner reading one and then watching it change is worse served
 * than one who waited half a second looking at a rectangle.
 *
 * `aria-hidden` throughout. The live region that says "loading" belongs to the
 * route's `loading.tsx`, once, rather than to each of forty rectangles.
 */
export function Skeleton({ className }: { readonly className?: string }): ReactElement {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-chip bg-neutral-100', className)}
    />
  );
}

const LINE_WIDTHS = ['w-11/12', 'w-3/4', 'w-1/2', 'w-2/3'] as const;

/**
 * One panel's worth of skeleton — the card chrome the real panels use, with a
 * header rule and a few lines under it, so the frame does not jump when the
 * content replaces it.
 */
export function SkeletonPanel({
  className,
  lines = 3,
}: {
  readonly className?: string;
  readonly lines?: number;
}): ReactElement {
  return (
    <section className={cn('card', className)}>
      <div className="border-b border-hairline px-4 py-2">
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex flex-col gap-2 p-4">
        {/*
          Ragged rather than uniform: equal-length bars read as a table of data,
          which is the one thing a skeleton must not look like.
        */}
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton className={cn('h-3', LINE_WIDTHS[index % LINE_WIDTHS.length])} key={index} />
        ))}
      </div>
    </section>
  );
}
