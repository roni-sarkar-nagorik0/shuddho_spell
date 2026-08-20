import { type IExamQuestionForLearner } from '../../domain/entities/exam-question';
import { type ExamCode } from '../../domain/value-objects/exam-code';
import { type ExamSectionCode } from '../../domain/value-objects/exam-section-code';
import { type ExamStatus } from '../../domain/value-objects/exam-status';

/** One saved answer, as the runtime needs it back on resume. */
export interface IExamAnswerView {
  readonly questionId: string;
  readonly submittedValue: string | null;
  readonly flagged: boolean;
}

/**
 * A live attempt, as the exam runtime sees it.
 *
 * `remainingSeconds` is computed on the server from `serverDeadlineAt` and the
 * server's own clock — rule 6. The browser interpolates between syncs for the
 * countdown's smoothness and is never believed: a submission is validated
 * against the column, not against whatever the tab thought the time was.
 *
 * The questions are `IExamQuestionForLearner`, which **has no field** for the
 * answer key. That is rule 3 held by the type system rather than by a habit of
 * deleting a property before serialising.
 */
export interface IExamAttemptView {
  readonly attemptId: string;
  readonly code: ExamCode;
  readonly title: string;
  readonly status: ExamStatus;
  readonly attemptNumber: number;
  readonly currentSectionIndex: number;
  readonly currentSectionCode: ExamSectionCode | null;
  readonly sectionCount: number;
  readonly remainingSeconds: number;
  readonly serverDeadlineAt: string;
  readonly questions: readonly IExamQuestionForLearner[];
  readonly answers: readonly IExamAnswerView[];
}
