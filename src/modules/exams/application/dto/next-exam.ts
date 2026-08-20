import { type ExamCode } from '../../domain/value-objects/exam-code';

/**
 * The next exam a learner has ahead of them, with the honest answer to
 * "should I sit it?".
 *
 * `null` readiness means the exam is still locked and there is nothing to
 * predict from yet — the lobby computes it once the day arrives. Saying 0%
 * would be a prediction, and a wrong one.
 */
export interface INextExam {
  readonly code: ExamCode;
  readonly title: string;
  readonly unlockDayIndex: number;
  /** Negative once the day has passed; zero on the day itself. */
  readonly daysUntilUnlock: number;
  readonly isUnlocked: boolean;
  readonly durationSeconds: number;
  readonly questionCount: number;
  readonly passPercent: number | null;
  readonly predictedScorePercent: number | null;
  readonly likelyToPass: boolean | null;
}
