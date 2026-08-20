'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from './query-keys';
import { NEVER_RETRY } from './retry-policy';

/** What the runtime holds for one question. The server owns the truth; this is the draft. */
export interface IExamAnswerDraft {
  readonly questionId: string;
  readonly submittedValue: string;
  readonly flagged: boolean;
  /** True while the write for this answer is still in flight. */
  readonly pending: boolean;
}

export interface ISaveExamAnswerInput {
  readonly questionId: string;
  readonly submittedValue: string;
  readonly timeSpentMs: number | null;
}

export interface IExamAnswerCache {
  readonly byQuestionId: Readonly<Record<string, IExamAnswerDraft>>;
}

interface IRollback {
  readonly previous: IExamAnswerCache | undefined;
}

/**
 * The response body carries nothing. The server confirms by not failing — it
 * must never echo anything derived from the answer, because `08-exam-engine.md`
 * forbids any hint of correctness before submission.
 */
const emptySchema = z.undefined();

const EMPTY_CACHE: IExamAnswerCache = { byQuestionId: {} };

function withDraft(
  cache: IExamAnswerCache,
  draft: IExamAnswerDraft,
): IExamAnswerCache {
  return { byQuestionId: { ...cache.byQuestionId, [draft.questionId]: draft } };
}

/**
 * Optimistic answer saving — the one place in the product where the cache moves
 * before the server agrees.
 *
 * `13-frontend.md`: "the learner must never wait on the network to move to the
 * next question." So the answer lands in the cache in `onMutate`, the navigator
 * repaints immediately, and the request follows.
 *
 * **It is never retried.** The global mutation default is already
 * `NEVER_RETRY`; it is restated here because this is the mutation the rule was
 * written for and a future edit to the defaults must not silently change it. A
 * retry that lands after the deadline is not a saved answer, it is a support
 * ticket.
 *
 * On failure the previous cache is restored and `pending` clears, so the
 * runtime can mark the question as unsaved and say so. Nothing is invalidated
 * on success: refetching the answer sheet mid-exam would replace what the
 * learner is typing with what the server last heard.
 */
export function useSaveExamAnswer(
  attemptId: string,
): UseMutationResult<undefined, Error, ISaveExamAnswerInput, IRollback> {
  const client = useQueryClient();
  const key = queryKeys.examAnswers(attemptId);

  // `undefined` rather than `void` as the data type: the endpoint returns an
  // empty envelope, and `void` in a generic argument is a type the lint rules
  // reject outright — it means "ignore this", which is not what an empty
  // successful response means.
  return useMutation<undefined, Error, ISaveExamAnswerInput, IRollback>({
    retry: NEVER_RETRY,

    mutationFn: async (input) =>
      apiFetch(`/api/v1/exams/attempts/${attemptId}/answers`, {
        method: 'PATCH',
        schema: emptySchema,
        body: {
          action: 'answer',
          questionId: input.questionId,
          submittedValue: input.submittedValue,
          timeSpentMs: input.timeSpentMs,
        },
      }),

    onMutate: async (input) => {
      // An in-flight read of the answer sheet would resolve after this write
      // and overwrite it with the pre-answer state.
      await client.cancelQueries({ queryKey: key });

      const previous = client.getQueryData<IExamAnswerCache>(key);
      const existing = previous?.byQuestionId[input.questionId];

      client.setQueryData<IExamAnswerCache>(
        key,
        withDraft(previous ?? EMPTY_CACHE, {
          questionId: input.questionId,
          submittedValue: input.submittedValue,
          flagged: existing?.flagged ?? false,
          pending: true,
        }),
      );

      return { previous };
    },

    onError: (_error, _input, context) => {
      if (context !== undefined) {
        client.setQueryData<IExamAnswerCache>(key, context.previous ?? EMPTY_CACHE);
      }
    },

    onSuccess: (_data, input) => {
      const current = client.getQueryData<IExamAnswerCache>(key) ?? EMPTY_CACHE;
      const draft = current.byQuestionId[input.questionId];

      if (draft !== undefined) {
        client.setQueryData<IExamAnswerCache>(key, withDraft(current, { ...draft, pending: false }));
      }
    },
  });
}
