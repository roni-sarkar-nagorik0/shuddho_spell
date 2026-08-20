import { type ExamCode } from '../../domain/value-objects/exam-code';
import { type ExamSectionCode } from '../../domain/value-objects/exam-section-code';

export interface IExamCatalogueSection {
  readonly code: ExamSectionCode;
  readonly weight: number;
  readonly questionCount: number;
}

/**
 * Why a learner cannot start this exam right now.
 *
 * A discriminated union rather than a boolean plus a message, because the three
 * reasons need different words and different next actions: waiting for a day to
 * arrive, waiting for a cooldown to run down, and having nothing left to spend
 * are not the same disappointment.
 */
export type ExamLock =
  | { readonly kind: 'open' }
  | { readonly kind: 'not_reached'; readonly unlockDayIndex: number; readonly daysAway: number }
  | { readonly kind: 'cooling_down'; readonly remainingSeconds: number; readonly retryAt: string }
  | { readonly kind: 'exhausted'; readonly maxAttempts: number; readonly used: number };

export interface IExamCatalogueEntry {
  readonly code: ExamCode;
  readonly title: string;
  readonly unlockDayIndex: number;
  readonly durationSeconds: number;
  readonly questionCount: number;
  readonly passPercent: number | null;
  readonly maxAttempts: number | null;
  readonly cooldownHours: number | null;
  readonly sections: readonly IExamCatalogueSection[];
  readonly attemptsUsed: number;
  readonly bestScorePercent: number | null;
  readonly hasPassed: boolean;
  /**
   * **The server's verdict, not the client's.** The lock a learner sees is the
   * same evaluation `StartExamAttempt` runs, so the button and the endpoint can
   * never disagree — and a learner who ignores the button still gets refused.
   */
  readonly lock: ExamLock;
  /** `null` until the exam has unlocked; there is little to predict from before. */
  readonly predictedScorePercent: number | null;
  readonly likelyToPass: boolean | null;
  /** The attempt already in flight, if there is one. Resuming beats starting. */
  readonly activeAttemptId: string | null;
}

export interface IExamCatalogue {
  readonly exams: readonly IExamCatalogueEntry[];
  readonly currentDayIndex: number;
}
