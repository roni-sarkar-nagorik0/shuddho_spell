'use client';

import { useCallback, useState, type FormEvent, type ReactElement } from 'react';
import { StatusBadge } from '@/components/primitives/status-badge';
import { apiFetch } from '@/lib/api/client';
import { reviewResultSchema, type ReviewResult } from './review-contracts';

export interface IDrillItem {
  readonly reviewItemId: string;
  readonly prompt: string;
  readonly daysOverdue: number;
  readonly lastErrorTags: readonly string[];
  /** Why this item is here. `null` inside a lesson, where the queue is simply the queue. */
  readonly reason?: string | null;
}

export interface IReviewDrillProps {
  readonly items: readonly IDrillItem[];
  readonly totalDue: number;
  readonly onFinished: () => void;
  readonly finishLabel: string;
  readonly emptyMessage: string;
}

/**
 * One pass through a review queue: prompt, answer, verdict, next.
 *
 * Shared by the lesson's review stage and by `/practice`, because they are the
 * same act on the same queue — the only difference is what happens at the end.
 * Two copies of this would have drifted the moment one of them learned
 * something about error tags that the other did not.
 *
 * **The answer is never checked here.** `submittedValue` goes to the server,
 * the server decides, and the server schedules the next repetition. A client
 * that graded its own review would be a learner grading their own review.
 */
export function ReviewDrill({
  items,
  totalDue,
  onFinished,
  finishLabel,
  emptyMessage,
}: IReviewDrillProps): ReactElement {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const current = items[index] ?? null;

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

    if (index + 1 >= items.length) {
      onFinished();
      return;
    }

    setIndex((position) => position + 1);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-muted">{emptyMessage}</p>
        <button
          className="h-8 rounded-control bg-primary-900 px-3 text-surface"
          onClick={onFinished}
          type="button"
        >
          {finishLabel}
        </button>
      </div>
    );
  }

  if (current === null) {
    return <p className="text-muted">Finished.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="num text-[11px] text-muted">
        {index + 1} of {items.length}
        {totalDue > items.length && ` · ${String(totalDue)} due in total`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <p className="font-display text-2xl tracking-tight text-primary-900">{current.prompt}</p>
        {current.daysOverdue > 0 && (
          <StatusBadge label={`${String(current.daysOverdue)}d overdue`} tone="due" />
        )}
        {current.reason === 'weakness' && <StatusBadge label="Targets a weakness" tone="active" />}
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
            autoFocus
            className="h-8 rounded-control bg-primary-900 px-3 text-surface"
            onClick={next}
            type="button"
          >
            {index + 1 >= items.length ? finishLabel : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
