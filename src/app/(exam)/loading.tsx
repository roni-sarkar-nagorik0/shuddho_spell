import { type ReactElement } from 'react';
import { Skeleton } from '@/components/primitives/skeleton';

/**
 * The exam screen's wait.
 *
 * A paper is fetched in one go and the clock does not start until it has
 * arrived, so this stands in for the whole question area rather than for a
 * single question — and it shows no timer, because a skeleton clock counting
 * nothing is the one thing a candidate must not see.
 */
export default function ExamLoading(): ReactElement {
  return (
    <>
      <div aria-live="polite" className="sr-only" role="status">
        Loading the paper
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-10">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-1/2" />
        <div className="card flex flex-col gap-3 p-6">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="card flex flex-col gap-3 p-6">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </>
  );
}
