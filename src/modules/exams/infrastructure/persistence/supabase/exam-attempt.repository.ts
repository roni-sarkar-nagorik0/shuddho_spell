import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type ExamAttempt } from '../../../domain/entities/exam-attempt';
import { type IExamAttemptRepository } from '../../../domain/repositories/exam-attempt-repository';
import {
  EXAM_ATTEMPT_COLUMNS,
  toExamAttempt,
  toExamAttempts,
  toExamAttemptRow,
} from '../../mappers/exam-attempt.mapper';

const TABLE = 'exam_attempts';

export class SupabaseExamAttemptRepository implements IExamAttemptRepository {
  constructor(private readonly db: IDatabase) {}

  async findById(id: string): Promise<ExamAttempt | null> {
    return toExamAttempt(
      await this.db.selectOne({ table: TABLE, columns: EXAM_ATTEMPT_COLUMNS, eq: { id } }),
    );
  }

  /**
   * The live attempt, if there is one. At most one can exist: 004's partial
   * unique index on `status = 'in_progress'` makes a second concurrent attempt
   * a database error rather than a race the API has to keep winning.
   */
  async findActive(profileId: string, definitionId: string): Promise<ExamAttempt | null> {
    return toExamAttempt(
      await this.db.selectOne({
        table: TABLE,
        columns: EXAM_ATTEMPT_COLUMNS,
        eq: { profile_id: profileId, definition_id: definitionId, status: 'in_progress' },
      }),
    );
  }

  /** Newest first, so the caller reads the cooldown off the head of the list. */
  async findForExam(profileId: string, definitionId: string): Promise<readonly ExamAttempt[]> {
    return toExamAttempts(
      await this.db.select({
        table: TABLE,
        columns: EXAM_ATTEMPT_COLUMNS,
        eq: { profile_id: profileId, definition_id: definitionId },
        orderBy: { column: 'attempt_number', ascending: false },
      }),
    );
  }

  async findAllForProfile(profileId: string): Promise<readonly ExamAttempt[]> {
    return toExamAttempts(
      await this.db.select({
        table: TABLE,
        columns: EXAM_ATTEMPT_COLUMNS,
        eq: { profile_id: profileId },
      }),
    );
  }

  /**
   * Open attempts whose deadline has passed, across every learner.
   *
   * The filtering is `status = 'in_progress'` **and** `server_deadline_at <=
   * now`, both in SQL: this runs on a schedule over the whole table, and
   * fetching every live attempt to filter in TypeScript would scale with the
   * product's success.
   */
  async findAbandoned(now: Date): Promise<readonly ExamAttempt[]> {
    return toExamAttempts(
      await this.db.select({
        table: TABLE,
        columns: EXAM_ATTEMPT_COLUMNS,
        eq: { status: 'in_progress' },
        lte: { column: 'server_deadline_at', value: now.toISOString() },
      }),
    );
  }

  /**
   * Writes the whole row.
   *
   * **`server_deadline_at` travels in it**, and that is safe for exactly one
   * reason: no method on `ExamAttempt` changes the value after `start()`, so
   * whatever is written is what was read. The alternative — omitting the column
   * here — would look safer and hide the fact that the guarantee lives in the
   * entity, where it can be tested.
   */
  async save(attempt: ExamAttempt): Promise<ExamAttempt> {
    await this.db.update(TABLE, toExamAttemptRow(attempt), { id: attempt.id });

    return attempt;
  }
}
