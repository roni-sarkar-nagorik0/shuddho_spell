import { type JsonValue } from '@/modules/shared/domain/value-objects/json-value';
import { type ExamCode } from '../../domain/value-objects/exam-code';
import { type ExamSectionCode } from '../../domain/value-objects/exam-section-code';
import { type ExamStatus } from '../../domain/value-objects/exam-status';

export interface IExamSectionResult {
  readonly code: ExamSectionCode;
  readonly weight: number;
  readonly percent: number;
}

/** The mark, and everything a learner needs to understand it. */
export interface IExamResultView {
  readonly attemptId: string;
  readonly code: ExamCode;
  readonly title: string;
  readonly status: ExamStatus;
  readonly attemptNumber: number;
  readonly scorePercent: number;
  /** Null for the ungraded diagnostic: there was no mark to miss. */
  readonly passPercent: number | null;
  readonly passed: boolean | null;
  readonly sections: readonly IExamSectionResult[];
  readonly submittedAt: string;
}

/**
 * One question, opened up after the fact.
 *
 * **This is the only shape in the product that carries `correctAnswer`**, and
 * it is reachable only once the attempt is submitted — `GetExamAnswerReview`
 * refuses otherwise. Rule 3 bounds the answer key by time rather than by route:
 * the review is allowed to show it, and nothing is allowed to show it early.
 */
export interface IExamAnswerReviewItem {
  readonly questionId: string;
  readonly sectionCode: ExamSectionCode;
  readonly orderIndex: number;
  readonly payload: JsonValue;
  readonly submittedValue: string | null;
  readonly isCorrect: boolean | null;
  readonly awardedPoints: number;
  readonly flagged: boolean;
  readonly correctAnswer: JsonValue;
}

export interface IExamAnswerReviewView {
  readonly attemptId: string;
  readonly items: readonly IExamAnswerReviewItem[];
}
