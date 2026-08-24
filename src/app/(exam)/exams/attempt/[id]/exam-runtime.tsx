'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { z } from 'zod';
import { examAttemptSchema, type ExamAttemptView } from '@/app/(learn)/exams/[code]/exam-contracts';
import { ExamCountdown } from '@/components/exam/exam-countdown';
import { QuestionNavigator } from '@/components/exam/question-navigator';
import { ConfirmDialog } from '@/components/overlays/confirm-dialog';
import { apiFetch } from '@/lib/api/client';
import { useSaveExamAnswer } from '@/lib/query/use-save-exam-answer';
import { QuestionView } from './question-view';
import { useAnswerAutosave } from './use-answer-autosave';
import { useExamGuard } from './use-exam-guard';

const sectionSubmittedSchema = z.object({
  attemptId: z.string(),
  submittedSection: z.string(),
  currentSectionIndex: z.number(),
  currentSectionCode: z.string().nullable(),
  isPaperComplete: z.boolean(),
  remainingSeconds: z.number(),
});

/** A minute. Often enough to catch drift, rare enough not to be a poll. */
const RESYNC_INTERVAL_MS = 60_000;

const outcomeSchema = z.object({
  attemptId: z.string(),
  scorePercent: z.number(),
  passed: z.boolean(),
  passPercent: z.number().nullable(),
  currentDayIndex: z.number(),
  prescribedItems: z.number(),
});

/**
 * The exam runtime.
 *
 * **The client displays; the server decides.** Everything on screen came from
 * `GET /api/v1/exams/attempts/active` — the questions, the saved answers, the
 * section the learner is on, the seconds left. Nothing is computed here that
 * the server also computes, and nothing computed here is ever sent back as
 * fact.
 *
 * Answers save optimistically through `useSaveExamAnswer` (F10.7): the value
 * lands in the cache before the request leaves, so moving to the next question
 * never waits on the network. **That mutation is never retried** — a retried
 * write landing after the deadline is a support ticket, not a saved answer.
 *
 * Section submission is one-way and the confirm dialog says so, because rule 4
 * means there is no endpoint anywhere that can reopen one.
 */
export function ExamRuntime({ attemptId }: { readonly attemptId: string }): ReactElement {
  const [attempt, setAttempt] = useState<ExamAttemptView | null>(null);
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
  const [flags, setFlags] = useState<Readonly<Record<string, boolean>>>({});
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  /**
   * Bumped on every response that carries a fresh `remainingSeconds`, so the
   * countdown re-anchors to the server's figure rather than drifting on the
   * browser's.
   */
  const [syncToken, setSyncToken] = useState(0);
  const router = useRouter();
  const save = useSaveExamAnswer(attemptId);

  useExamGuard(attempt !== null && !finished);

  useEffect(() => {
    void apiFetch('/api/v1/exams/attempts/active', { schema: examAttemptSchema.nullable() })
      .then((active) => {
        if (active === null || active.attemptId !== attemptId) {
          // Nothing running, or a different attempt: the catalogue is the only
          // honest place to send them.
          router.replace('/exams');
          return;
        }

        setAttempt(active);
        setSyncToken((token) => token + 1);
        setDrafts(
          Object.fromEntries(
            active.answers.map((answer) => [answer.questionId, answer.submittedValue ?? '']),
          ),
        );
        setFlags(
          Object.fromEntries(active.answers.map((answer) => [answer.questionId, answer.flagged])),
        );
      })
      .catch(() => { setError('This attempt could not be opened.'); });
  }, [attemptId, router]);

  const sectionQuestions = useMemo(() => {
    if (attempt === null) {
      return [];
    }

    return [...attempt.questions]
      .filter((question) => question.sectionCode === attempt.currentSectionCode)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [attempt]);

  const current = sectionQuestions[index] ?? null;

  const write = useCallback(
    (questionId: string, value: string) => {
      save.mutate({ questionId, submittedValue: value, timeSpentMs: null });
    },
    [save],
  );

  const autosave = useAnswerAutosave({ save: write });

  const setAnswer = useCallback(
    (questionId: string, value: string) => {
      // The draft moves first — the learner must never wait on the network to
      // see their own typing, let alone to move on.
      setDrafts((existing) => ({ ...existing, [questionId]: value }));
      autosave.queue(questionId, value);
    },
    [autosave],
  );

  /**
   * Re-anchor the clock and the saved answers whenever the tab comes back.
   *
   * A suspended tab is the one case a locally interpolated countdown gets
   * badly wrong, and it is exactly the case a learner creates by switching
   * away. Asking the server on return costs one request and makes the
   * displayed time true again.
   */
  useEffect(() => {
    if (attempt === null || finished) {
      return undefined;
    }

    const resync = (): void => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      void apiFetch('/api/v1/exams/attempts/active', { schema: examAttemptSchema.nullable() })
        .then((active) => {
          if (active !== null && active.attemptId === attemptId) {
            setAttempt(active);
            setSyncToken((token) => token + 1);
          }
        })
        .catch(() => undefined);
    };

    document.addEventListener('visibilitychange', resync);
    const handle = window.setInterval(resync, RESYNC_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', resync);
      window.clearInterval(handle);
    };
  }, [attempt, attemptId, finished]);

  /**
   * Flagging is a write like any other, and the same rule applies: the local
   * state moves first so the navigator repaints instantly, and the request is
   * never retried. A flag that failed to save is a mark the learner will not
   * find on their next visit, which is a smaller loss than a duplicated write
   * against a deadline.
   */
  const toggleFlag = useCallback(
    (questionId: string) => {
      const flagged = !(flags[questionId] ?? false);
      setFlags((existing) => ({ ...existing, [questionId]: flagged }));

      void apiFetch(`/api/v1/exams/attempts/${attemptId}/answers`, {
        method: 'PATCH',
        schema: z.undefined(),
        body: { action: 'flag', questionId, flagged },
      }).catch(() => {
        setFlags((existing) => ({ ...existing, [questionId]: !flagged }));
      });
    },
    [attemptId, flags],
  );

  const submitSection = useCallback(() => {
    if (attempt === null || attempt.currentSectionCode === null) {
      return;
    }

    setConfirming(false);
    setError(null);

    // Nothing half-typed goes unsaved into a section that cannot be reopened.
    autosave.flush();

    void apiFetch(
      `/api/v1/exams/attempts/${attemptId}/sections/${attempt.currentSectionCode}/submit`,
      { method: 'POST', schema: sectionSubmittedSchema },
    )
      .then((result) => {
        if (result.isPaperComplete) {
          return apiFetch(`/api/v1/exams/attempts/${attemptId}/submit`, {
            method: 'POST',
            schema: outcomeSchema,
          }).then(() => {
            setFinished(true);
            router.push(`/exams/result/${attemptId}`);
          });
        }

        setIndex(0);

        // The section moved, so the questions on screen must come from the
        // server's new view of the attempt rather than from a local guess at
        // which section is next.
        return apiFetch('/api/v1/exams/attempts/active', { schema: examAttemptSchema.nullable() })
          .then((active) => {
            setAttempt(active);
            setSyncToken((token) => token + 1);
          });
      })
      .catch(() => {
        setError('That section could not be submitted. Your answers are saved — try again.');
      });
  }, [attempt, attemptId, router, autosave]);

  /**
   * The clock reached zero on the learner's screen.
   *
   * This hands the paper in; it does not decide anything. Rule 9's cron would
   * auto-submit the attempt anyway, and rule 2 already refuses any write past
   * `serverDeadlineAt` — so a browser clock running fast submits early (the
   * learner's loss of a few seconds, and their own device's fault) and one
   * running slow changes nothing, because the server stopped accepting writes
   * when it said it would.
   */
  const onExpired = useCallback(() => {
    if (finished) {
      return;
    }

    setFinished(true);

    void apiFetch(`/api/v1/exams/attempts/${attemptId}/submit`, {
      method: 'POST',
      schema: outcomeSchema,
    })
      .catch(() => undefined)
      .finally(() => { router.push(`/exams/result/${attemptId}`); });
  }, [attemptId, finished, router]);

  if (error !== null && attempt === null) {
    return <p className="p-8 text-tertiary-100">{error}</p>;
  }

  if (attempt === null) {
    return <p className="p-8 text-primary-100">Opening your paper…</p>;
  }

  const answered = sectionQuestions.filter(
    (question) => (drafts[question.id] ?? '') !== '',
  ).length;

  return (
    <div className="flex min-h-screen flex-col">
      {/*
        The clock is the one thing in this row that must never be pushed off the
        screen, so it is the only item that does not shrink. The title truncates
        and the section counter drops below `sm` — it is restated as "Question n
        of m" directly under this bar, which is where a learner reads it anyway.
      */}
      <header className="flex h-topbar shrink-0 items-center gap-2 border-b border-primary-700 px-3 sm:gap-4 sm:px-4">
        <span className="min-w-0 flex-1 truncate font-medium">{attempt.title}</span>
        <span className="num shrink-0 text-primary-100 max-sm:hidden">
          section {attempt.currentSectionIndex + 1} of {attempt.sectionCount}
        </span>
        <span className="num shrink-0 text-primary-100 max-sm:hidden">
          {answered}/{sectionQuestions.length} answered
        </span>

        <span className="shrink-0">
          <ExamCountdown
            onExpired={onExpired}
            serverRemainingSeconds={attempt.remainingSeconds}
            syncToken={syncToken}
          />
        </span>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-content flex-col gap-6">
          {error !== null && <p className="text-tertiary-100">{error}</p>}

          {current === null ? (
            <p className="text-primary-100">This section has no questions.</p>
          ) : (
            <>
              <p className="num flex items-center gap-3 text-primary-100">
                <span>
                  Question {index + 1} of {sectionQuestions.length}
                </span>
                {/*
                  Saving state, said plainly. A learner who cannot tell whether
                  their answer is safe will not leave the page — and this is a
                  timed paper.
                */}
                <span aria-live="polite">
                  {autosave.pendingCount > 0 ? 'saving…' : 'all answers saved'}
                </span>
              </p>

              <QuestionView
                disabled={false}
                onChange={(value) => { setAnswer(current.id, value); }}
                question={current}
                value={drafts[current.id] ?? ''}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  aria-pressed={flags[current.id] ?? false}
                  className="h-9 rounded-control border border-secondary-500 px-3 text-secondary-500"
                  onClick={() => { toggleFlag(current.id); }}
                  type="button"
                >
                  {flags[current.id] === true ? 'Unflag' : 'Flag for review'}
                </button>

                <button
                  className="h-9 rounded-control border border-primary-100 px-3 text-primary-100 disabled:border-primary-700 disabled:text-primary-700"
                  disabled={index === 0}
                  onClick={() => { autosave.flush(); setIndex((position) => position - 1); }}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="h-9 rounded-control border border-primary-100 px-3 text-primary-100 disabled:border-primary-700 disabled:text-primary-700"
                  disabled={index + 1 >= sectionQuestions.length}
                  onClick={() => { autosave.flush(); setIndex((position) => position + 1); }}
                  type="button"
                >
                  Next
                </button>

                <button
                  className="ml-auto h-9 rounded-control bg-secondary-500 px-4 text-primary-900"
                  onClick={() => { setConfirming(true); }}
                  type="button"
                >
                  Submit this section
                </button>
              </div>

              <div className="mt-2 border-t border-primary-700 pt-4">
                <QuestionNavigator
                  currentIndex={index}
                  entries={sectionQuestions.map((question) => ({
                    questionId: question.id,
                    answered: (drafts[question.id] ?? '') !== '',
                    flagged: flags[question.id] ?? false,
                  }))}
                  onJump={(next) => { autosave.flush(); setIndex(next); }}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <ConfirmDialog
        body={`${String(sectionQuestions.length - answered)} of ${String(sectionQuestions.length)} questions are still blank. A submitted section cannot be reopened.`}
        cancelLabel="Keep working"
        confirmLabel="Submit the section"
        destructive
        onCancel={() => { setConfirming(false); }}
        onConfirm={submitSection}
        open={confirming}
        title="Submit this section?"
      />
    </div>
  );
}
