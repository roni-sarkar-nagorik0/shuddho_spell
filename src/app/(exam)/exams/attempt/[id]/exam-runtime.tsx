'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { z } from 'zod';
import { examAttemptSchema, type ExamAttemptView } from '@/app/(learn)/exams/[code]/exam-contracts';
import { ConfirmDialog } from '@/components/overlays/confirm-dialog';
import { MonoValue } from '@/components/primitives/mono-value';
import { apiFetch } from '@/lib/api/client';
import { useSaveExamAnswer } from '@/lib/query/use-save-exam-answer';
import { QuestionView } from './question-view';
import { useExamGuard } from './use-exam-guard';

const sectionSubmittedSchema = z.object({
  attemptId: z.string(),
  submittedSection: z.string(),
  currentSectionIndex: z.number(),
  currentSectionCode: z.string().nullable(),
  isPaperComplete: z.boolean(),
  remainingSeconds: z.number(),
});

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
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
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
        setDrafts(
          Object.fromEntries(
            active.answers.map((answer) => [answer.questionId, answer.submittedValue ?? '']),
          ),
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

  const setAnswer = useCallback(
    (questionId: string, value: string) => {
      setDrafts((existing) => ({ ...existing, [questionId]: value }));
      save.mutate({ questionId, submittedValue: value, timeSpentMs: null });
    },
    [save],
  );

  const submitSection = useCallback(() => {
    if (attempt === null || attempt.currentSectionCode === null) {
      return;
    }

    setConfirming(false);
    setError(null);

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
          .then((active) => { setAttempt(active); });
      })
      .catch(() => {
        setError('That section could not be submitted. Your answers are saved — try again.');
      });
  }, [attempt, attemptId, router]);

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
      <header className="flex h-topbar shrink-0 items-center gap-4 border-b border-primary-700 px-4">
        <span className="font-medium">{attempt.title}</span>
        <span className="num text-primary-100">
          section {attempt.currentSectionIndex + 1} of {attempt.sectionCount}
        </span>
        <span className="num text-primary-100">
          {answered}/{sectionQuestions.length} answered
        </span>

        <span className="ml-auto flex items-center gap-2">
          <span className="label text-primary-100">Remaining</span>
          <MonoValue unit="s" value={attempt.remainingSeconds} />
        </span>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto flex max-w-content flex-col gap-6">
          {error !== null && <p className="text-tertiary-100">{error}</p>}

          {current === null ? (
            <p className="text-primary-100">This section has no questions.</p>
          ) : (
            <>
              <p className="num text-primary-100">
                Question {index + 1} of {sectionQuestions.length}
              </p>

              <QuestionView
                disabled={false}
                onChange={(value) => { setAnswer(current.id, value); }}
                question={current}
                value={drafts[current.id] ?? ''}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="h-9 rounded-control border border-primary-100 px-3 text-primary-100 disabled:border-primary-700 disabled:text-primary-700"
                  disabled={index === 0}
                  onClick={() => { setIndex((position) => position - 1); }}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="h-9 rounded-control border border-primary-100 px-3 text-primary-100 disabled:border-primary-700 disabled:text-primary-700"
                  disabled={index + 1 >= sectionQuestions.length}
                  onClick={() => { setIndex((position) => position + 1); }}
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
