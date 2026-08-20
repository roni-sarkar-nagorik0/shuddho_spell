import { type ExamQuestion, type IExamQuestionForLearner } from '../entities/exam-question';

export const EXAM_QUESTION_REPOSITORY = Symbol('EXAM_QUESTION_REPOSITORY');

export interface IExamQuestionRepository {
  /**
   * The whole paper, ordered by section and then position.
   *
   * These entities carry `correctAnswer`, because marking happens on the
   * server. Nothing that returns them to a caller may serialise them directly —
   * `ExamQuestion.forLearner()` is the only shape that crosses the wire before
   * submission (rule 3).
   */
  readonly findByAttempt: (attemptId: string) => Promise<readonly ExamQuestion[]>;

  readonly findById: (id: string) => Promise<ExamQuestion | null>;

  /**
   * The same paper with the answer key **never selected**.
   *
   * Two reads rather than one plus a mapping step, because the guarantee is
   * worth more when the column does not travel: a query that does not name
   * `correct_answer` cannot leak it through a spread, a log line or a mapper
   * somebody edits in a hurry. This is the read every pre-submission endpoint
   * uses; the other one is for marking.
   */
  readonly findByAttemptForLearner: (
    attemptId: string,
  ) => Promise<readonly IExamQuestionForLearner[]>;
}
