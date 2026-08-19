import { type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';

/**
 * What the learner is told about one answer.
 *
 * `correctValue` is present **only when they got it wrong**. Returning it on a
 * correct answer is harmless; returning it always is how an answer key ends up
 * in a network response, and the same discipline that keeps `correct_answer`
 * out of exam payloads applies here.
 */
export interface IAttemptResult {
  readonly attemptId: string;
  readonly isCorrect: boolean;
  readonly score: number;
  readonly errorTags: readonly ErrorTag[];
  readonly correctValue: string | null;
  readonly itemsTotal: number;
  readonly itemsCorrect: number;
}
