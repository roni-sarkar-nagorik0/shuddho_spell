import { type ExamCode } from '../value-objects/exam-code';

/**
 * A retake asked for too soon.
 *
 * Carries the remaining time because rule 5 asks for it in the problem detail:
 * "come back later" without a number is the kind of refusal a learner reads as
 * a bug.
 */
export class ExamCooldownActiveError extends Error {
  constructor(
    readonly code: ExamCode,
    readonly remainingSeconds: number,
    readonly retryAt: Date,
  ) {
    super(
      `exam ${code} can be retaken in ${String(remainingSeconds)}s, at ${retryAt.toISOString()}`,
    );
    this.name = 'ExamCooldownActiveError';
  }
}
