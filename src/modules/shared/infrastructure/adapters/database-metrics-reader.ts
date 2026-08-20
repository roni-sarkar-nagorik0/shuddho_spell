import {
  type IMetricsReader,
  type IMetricsSnapshot,
} from '@/modules/shared/application/ports/metrics-reader';
import { type IDatabase } from '../persistence/database';

/**
 * Five `count(*)` queries, issued together.
 *
 * `IDatabase.count` uses PostgREST's `head: true`, so none of the rows crosses
 * the wire — which matters, because `attempts` is the largest table in the
 * product and a scraper hits this every fifteen seconds.
 */
export class DatabaseMetricsReader implements IMetricsReader {
  constructor(private readonly db: IDatabase) {}

  async snapshot(now: Date): Promise<IMetricsSnapshot> {
    const [learners, lessonSessions, attempts, examAttemptsInProgress, reviewItemsDue] =
      await Promise.all([
        this.db.count({ table: 'learner_profiles', columns: 'id' }),
        this.db.count({ table: 'lesson_sessions', columns: 'id' }),
        this.db.count({ table: 'attempts', columns: 'id' }),
        this.db.count({ table: 'exam_attempts', columns: 'id', eq: { status: 'in_progress' } }),
        this.db.count({
          table: 'review_items',
          columns: 'id',
          lte: { column: 'due_at', value: now.toISOString() },
        }),
      ]);

    return { learners, lessonSessions, attempts, examAttemptsInProgress, reviewItemsDue };
  }
}
