import { type ExamAnswer } from '../entities/exam-answer';

export const EXAM_ANSWER_REPOSITORY = Symbol('EXAM_ANSWER_REPOSITORY');

export interface IExamAnswerRepository {
  readonly findByAttempt: (attemptId: string) => Promise<readonly ExamAnswer[]>;

  readonly findByQuestion: (questionId: string) => Promise<ExamAnswer | null>;

  /**
   * Creates or updates on `question_id`.
   *
   * The unique key is 004's `exam_answers_question_unique`, and it is what
   * makes a replayed save idempotent: a client that retries a write it already
   * made updates the row it has instead of leaving two answers to one question
   * and a score that depends on which is read first.
   */
  readonly upsert: (answer: ExamAnswer) => Promise<ExamAnswer>;

  /** Written once, at marking. One call rather than one per question. */
  readonly upsertMany: (answers: readonly ExamAnswer[]) => Promise<void>;
}
