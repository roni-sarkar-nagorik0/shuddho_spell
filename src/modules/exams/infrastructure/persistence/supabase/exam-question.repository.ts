import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import {
  type ExamQuestion,
  type IExamQuestionForLearner,
} from '../../../domain/entities/exam-question';
import { type IExamQuestionRepository } from '../../../domain/repositories/exam-question-repository';
import {
  EXAM_QUESTION_COLUMNS,
  EXAM_QUESTION_LEARNER_COLUMNS,
  toExamQuestion,
  toExamQuestions,
  toLearnerExamQuestions,
} from '../../mappers/exam-question.mapper';

const TABLE = 'exam_questions';

export class SupabaseExamQuestionRepository implements IExamQuestionRepository {
  constructor(private readonly db: IDatabase) {}

  /** With the answer key. Only marking calls this. */
  async findByAttempt(attemptId: string): Promise<readonly ExamQuestion[]> {
    return toExamQuestions(
      await this.db.select({
        table: TABLE,
        columns: EXAM_QUESTION_COLUMNS,
        eq: { attempt_id: attemptId },
        orderBy: { column: 'order_index', ascending: true },
      }),
    );
  }

  async findById(id: string): Promise<ExamQuestion | null> {
    return toExamQuestion(
      await this.db.selectOne({ table: TABLE, columns: EXAM_QUESTION_COLUMNS, eq: { id } }),
    );
  }

  /**
   * Without it. The column is not in the projection, so it never enters this
   * process — the strongest form of rule 3 available on the server side.
   */
  async findByAttemptForLearner(attemptId: string): Promise<readonly IExamQuestionForLearner[]> {
    return toLearnerExamQuestions(
      await this.db.select({
        table: TABLE,
        columns: EXAM_QUESTION_LEARNER_COLUMNS,
        eq: { attempt_id: attemptId },
        orderBy: { column: 'order_index', ascending: true },
      }),
    );
  }
}
