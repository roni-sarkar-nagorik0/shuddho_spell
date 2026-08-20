import { type ExamCode } from '../../domain/value-objects/exam-code';

/**
 * Where an exam sits in the programme, for a screen that draws the programme.
 *
 * Deliberately thin. The exam **catalogue** — attempts used, cooldown, best
 * score, readiness — is a richer read and belongs to `/exams` in Phase 12. A
 * milestone row on the programme table needs to say "day 14, Milestone 1,
 * locked" and nothing more, and giving it the catalogue's shape would mean
 * every programme render paying for five readiness predictions it does not
 * show.
 */
export interface IExamMilestone {
  readonly code: ExamCode;
  readonly title: string;
  /** Resolved for the learner's own track — day 14 differs between the two. */
  readonly unlockDayIndex: number;
  readonly isUnlocked: boolean;
  readonly hasPassed: boolean;
  /**
   * When the passing attempt was submitted, as an ISO instant, or `null`.
   *
   * Added by F11.12 so `/progress` can mark the accuracy chart on the day a
   * milestone was actually passed. The programme's day index cannot do that —
   * it says where in the course the exam sits, not what date the learner sat
   * it, and a chart drawn against dates needs a date.
   */
  readonly passedAt: string | null;
}
