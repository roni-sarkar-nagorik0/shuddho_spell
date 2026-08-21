import { type ReactElement } from 'react';
import { Skeleton, SkeletonPanel } from '@/components/primitives/skeleton';

/**
 * What a signed-in screen shows while its data is in flight.
 *
 * **This is the file that makes the product feel fast, and it is not a
 * micro-optimisation.** Every page in this group is `force-dynamic` and reads
 * from Supabase in Seoul, so a navigation costs a few hundred milliseconds of
 * round trips no amount of query tuning removes. Without a boundary here, Next
 * has nothing to show for that time and the browser sits on the *previous*
 * page: the learner clicks, nothing moves, and they click again. With it, the
 * rail and the frame stay put — the layout is not re-rendered on an in-group
 * navigation — and the panel area answers immediately.
 *
 * The skeleton is shape only. No number, no name, no streak: see `Skeleton`.
 */
export default function LearnLoading(): ReactElement {
  return (
    <>
      <div aria-live="polite" className="sr-only" role="status">
        Loading
      </div>

      <header className="col-span-12 flex items-baseline gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-24" />
      </header>

      <section className="card col-span-12 grid grid-cols-2 gap-6 p-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="flex flex-col gap-2" key={index}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-2 w-20" />
          </div>
        ))}
      </section>

      <SkeletonPanel className="col-span-12 lg:col-span-7" lines={2} />
      <SkeletonPanel className="col-span-12 lg:col-span-5" lines={3} />
      <SkeletonPanel className="col-span-12" lines={4} />
    </>
  );
}
