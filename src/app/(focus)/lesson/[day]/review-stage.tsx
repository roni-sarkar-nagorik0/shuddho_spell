'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { StatusBadge } from '@/components/primitives/status-badge';
import { apiFetch } from '@/lib/api/client';
import {
  dueReviewQueueSchema,
  reviewResultSchema,
  type DueReviewQueue,
  type ReviewResult,
} from './lesson-contracts';

/**
 * Stage one: yesterday's material, before anything new.
 *
 * The queue is the spaced-repetition queue, capped by the use case — a learner
 * returning after a fortnight meets a finishable set, not a wall
 * (`06-spaced-repetition.md`). An empty queue is a legitimate first state and
 * the stage says so rather than looking broken.
 *
 * The answer is never checked here. `submittedValue` goes to the server, the
 * server decides, and the server schedules the next repetition — a client that
 * graded its own review would be a learner grading their own review.
 */
export function ReviewStage({ onDone }: { readonly onDone: () => void }): ReactElement {
  const [queue, setQueue] = useState<DueReviewQueue | null>(null);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void apiFetch('/api/v1/review/due', { schema: dueReviewQueueSchema })
      .then(setQueue)
      .catch(() => { setQueue({ items: [], totalDue: 0 }); });
  }, []);

  const current = queue?.items[index] ?? null;

  const submit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();

      if (current === null || saving || value.trim() === '') {
        return;
      }

      setSaving(true);
      setFailed(false);

      void apiFetch('/api/v1/review/attempts', {
        method: 'POST',
        schema: reviewResultSchema,
        body: { reviewItemId: current.reviewItemId, submittedValue: value.trim() },
      })
        .then(setResult)
        .catch(() => { setFailed(true); })
        .finally(() => { setSaving(false); });
    },
    [current, saving, value],
  );

  const next = (): void => {
    setResult(null);
    setValue('');

    if (queue !== null && index + 1 >= queue.items.length) {
      onDone();
      return;
    }

    setIndex((current) => current + 1);
  };

  if (queue === null) {
    return <p className="text-muted">Loading the review queue…</p>;
  }

  if (queue.items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-muted">Nothing is due for review. Straight on to the new material.</p>
        <button
          className="h-8 rounded-control bg-primary-900 px-3 text-surface"
          onClick={onDone}
          type="button"
        >
          Continue
        </button>
      </div>
    );
  }

  if (current === null) {
    return <p className="text-muted">Review finished.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="num text-[11px] text-muted">
        {index + 1} of {queue.items.length}
        {queue.totalDue > queue.items.length && ` · ${String(queue.totalDue)} due in total`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <p className="font-display text-2xl tracking-tight text-primary-900">{current.prompt}</p>
        {current.daysOverdue > 0 && (
          <StatusBadge label={`${String(current.daysOverdue)}d overdue`} tone="due" />
        )}
        {current.lastErrorTags.map((tag) => (
          <StatusBadge key={tag} label={tag} tone="failed" />
        ))}
      </div>

      {result === null ? (
        <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
          <label className="sr-only" htmlFor="review-answer">
            Your answer
          </label>
          <input
            autoComplete="off"
            className="h-9 w-64 rounded-control border border-hairline px-3"
            id="review-answer"
            onChange={(event) => { setValue(event.target.value); }}
            spellCheck={false}
            value={value}
          />
          <button
            className="h-9 rounded-control bg-primary-900 px-3 text-surface disabled:bg-cold"
            disabled={saving || value.trim() === ''}
            type="submit"
          >
            {saving ? 'Checking…' : 'Check'}
          </button>
          {failed && (
            <p className="text-tertiary-500">That did not save. Try again — nothing was lost.</p>
          )}
        </form>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              label={result.isCorrect ? 'Correct' : 'Not quite'}
              tone={result.isCorrect ? 'passed' : 'failed'}
            />
            {result.correctValue !== null && !result.isCorrect && (
              <span>
                The answer is <span className="font-medium">{result.correctValue}</span>.
              </span>
            )}
            {result.isMastered && <StatusBadge label="Mastered" tone="passed" />}
          </div>

          <p className="num text-[11px] text-muted">
            Back on {new Date(result.nextDueAt).toLocaleDateString()}
          </p>

          <button
            className="h-8 rounded-control bg-primary-900 px-3 text-surface"
            onClick={next}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
