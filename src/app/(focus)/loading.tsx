import { type ReactElement } from 'react';
import { Skeleton } from '@/components/primitives/skeleton';

/**
 * The lesson screen's wait.
 *
 * Narrower than the learn group's on purpose: focus mode is one column with one
 * exercise in it, and a skeleton that promised four panels would be a different
 * page arriving than the one that was announced.
 */
export default function FocusLoading(): ReactElement {
  return (
    <>
      <div aria-live="polite" className="sr-only" role="status">
        Loading the lesson
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-10">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-2/3" />
        <div className="card flex flex-col gap-3 p-6">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </>
  );
}
