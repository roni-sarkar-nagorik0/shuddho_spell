import { type ExamSectionCode } from '../../domain/value-objects/exam-section-code';

/** What handing a paper in produced. */
export interface IExamOutcome {
  readonly attemptId: string;
  readonly scorePercent: number;
  readonly passed: boolean;
  /** Null for the ungraded diagnostic — there is no mark to have missed. */
  readonly passPercent: number | null;
  readonly sectionScores: Readonly<Partial<Record<ExamSectionCode, number>>>;
  /** Rule 7: the day they are on now. Unchanged unless they passed. */
  readonly currentDayIndex: number;
  /** Rule 8: how many drills the failure put in front of them. */
  readonly prescribedItems: number;
}
