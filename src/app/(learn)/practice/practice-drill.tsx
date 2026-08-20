'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactElement } from 'react';
import { ReviewDrill, type IDrillItem } from '@/components/lesson/review-drill';

/**
 * The practice session itself.
 *
 * The items arrive already ordered by `GetPracticeQueue` — weakness-targeting
 * first, then most overdue — so this component adds no selection of its own.
 * That is the point: the ordering is a server decision the learner can be told
 * about, not a shuffle the UI performs.
 */
export function PracticeDrill({
  items,
  totalDue,
}: {
  readonly items: readonly IDrillItem[];
  readonly totalDue: number;
}): ReactElement {
  const [done, setDone] = useState(false);
  const router = useRouter();

  if (done) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted">Session finished. The scheduler has moved everything you saw.</p>
        <button
          className="h-9 rounded-control bg-primary-900 px-4 text-surface"
          onClick={() => { router.refresh(); setDone(false); }}
          type="button"
        >
          Load the next set
        </button>
      </div>
    );
  }

  return (
    <ReviewDrill
      emptyMessage="Nothing is due. Practice sharpens what you have already got wrong — come back after a lesson."
      finishLabel="Finish"
      items={items}
      onFinished={() => { setDone(true); }}
      totalDue={totalDue}
    />
  );
}
