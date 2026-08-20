'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { ReviewDrill } from '@/components/lesson/review-drill';
import { dueReviewQueueSchema, type DueReviewQueue } from '@/components/lesson/review-contracts';
import { apiFetch } from '@/lib/api/client';

/**
 * Stage one: yesterday's material, before anything new.
 *
 * The queue is fetched here and run by `ReviewDrill`, the same component
 * `/practice` uses — the act is identical, only what happens at the end
 * differs. The cap on the queue is the use case's product decision
 * (`06-spaced-repetition.md`): a learner returning after a fortnight meets a
 * finishable set, not a wall.
 */
export function ReviewStage({ onDone }: { readonly onDone: () => void }): ReactElement {
  const [queue, setQueue] = useState<DueReviewQueue | null>(null);

  useEffect(() => {
    void apiFetch('/api/v1/review/due', { schema: dueReviewQueueSchema })
      .then(setQueue)
      // A queue that will not load must not block the lesson. An empty one
      // moves the learner on to the new material, which is the right failure.
      .catch(() => { setQueue({ items: [], totalDue: 0 }); });
  }, []);

  if (queue === null) {
    return <p className="text-muted">Loading the review queue…</p>;
  }

  return (
    <ReviewDrill
      emptyMessage="Nothing is due for review. Straight on to the new material."
      finishLabel="Continue"
      items={queue.items}
      onFinished={onDone}
      totalDue={queue.totalDue}
    />
  );
}
