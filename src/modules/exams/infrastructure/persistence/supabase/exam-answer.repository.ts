import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type ExamAnswer } from '../../../domain/entities/exam-answer';
import { type IExamAnswerRepository } from '../../../domain/repositories/exam-answer-repository';
import {
  EXAM_ANSWER_COLUMNS,
  toExamAnswer,
  toExamAnswers,
  toExamAnswerRow,
} from '../../mappers/exam-answer.mapper';

const TABLE = 'exam_answers';

/**
 * `ignoreDuplicates: false` on both writes, and the choice is the feature.
 *
 * A conflict here means the learner is changing an answer they already gave,
 * which is the normal thing to do in an exam. Ignoring the duplicate would
 * silently keep their first answer and return 200 — the worst kind of bug,
 * because the screen would show the new one.
 */
const UPSERT = { onConflict: 'question_id', ignoreDuplicates: false } as const;

export class SupabaseExamAnswerRepository implements IExamAnswerRepository {
  constructor(private readonly db: IDatabase) {}

  async findByAttempt(attemptId: string): Promise<readonly ExamAnswer[]> {
    return toExamAnswers(
      await this.db.select({
        table: TABLE,
        columns: EXAM_ANSWER_COLUMNS,
        eq: { attempt_id: attemptId },
      }),
    );
  }

  async findByQuestion(questionId: string): Promise<ExamAnswer | null> {
    return toExamAnswer(
      await this.db.selectOne({
        table: TABLE,
        columns: EXAM_ANSWER_COLUMNS,
        eq: { question_id: questionId },
      }),
    );
  }

  async upsert(answer: ExamAnswer): Promise<ExamAnswer> {
    await this.db.upsert(TABLE, [toExamAnswerRow(answer)], UPSERT);

    return answer;
  }

  async upsertMany(answers: readonly ExamAnswer[]): Promise<void> {
    if (answers.length === 0) {
      return;
    }

    await this.db.upsert(TABLE, answers.map(toExamAnswerRow), UPSERT);
  }
}
