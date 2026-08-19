import { z } from 'zod';
import { type DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { type LessonSession } from '../../../domain/entities/lesson-session';
import { type ILessonRepository } from '../../../domain/repositories/lesson-repository';
import {
  LESSON_SESSION_COLUMNS,
  toLessonSession,
  toLessonSessionRow,
} from '../../mappers/lesson-session.mapper';

const TABLE = 'lesson_sessions';

/** The completed-days read needs one column, so it has its own tiny schema. */
const completedDayRowSchema = z.object({ day_index: z.number().int() });

export class SupabaseLessonRepository implements ILessonRepository {
  constructor(private readonly db: IDatabase) {}

  async findById(id: string): Promise<LessonSession | null> {
    return toLessonSession(
      await this.db.selectOne({ table: TABLE, columns: LESSON_SESSION_COLUMNS, eq: { id } }),
    );
  }

  /**
   * The unfinished session for a day. `completed_at is null` is expressed as an
   * equality against null, which is what `IDatabase` offers and what
   * PostgREST turns into `is.null`.
   */
  async findOpenForDay(profileId: string, dayIndex: DayIndex): Promise<LessonSession | null> {
    return toLessonSession(
      await this.db.selectOne({
        table: TABLE,
        columns: LESSON_SESSION_COLUMNS,
        eq: { profile_id: profileId, day_index: dayIndex.value, completed_at: null },
      }),
    );
  }

  /**
   * One column, not whole sessions. The overview ticks 28 tiles, and loading 28
   * sessions to do it is the N+1 the phase gate is written against.
   */
  async findCompletedDayIndexes(profileId: string): Promise<readonly number[]> {
    const rows = await this.db.select({
      table: TABLE,
      columns: 'day_index',
      eq: { profile_id: profileId },
    });

    return parseRows(completedDayRowSchema, rows).map((row) => row.day_index);
  }

  async create(session: LessonSession): Promise<LessonSession> {
    await this.db.insert(TABLE, [toLessonSessionRow(session)]);

    return session;
  }

  /**
   * Writes the whole row and returns what it was given.
   *
   * Not a read-back, unlike the profile repository: a session has no check
   * constraint that can narrow a value, so there is nothing the database could
   * have changed that the caller needs told about.
   */
  async save(session: LessonSession): Promise<LessonSession> {
    await this.db.update(TABLE, toLessonSessionRow(session), { id: session.id });

    return session;
  }
}
