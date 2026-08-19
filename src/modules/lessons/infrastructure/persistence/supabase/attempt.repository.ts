import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type Attempt } from '../../../domain/entities/attempt';
import { type IAttemptRepository } from '../../../domain/repositories/attempt-repository';
import { ATTEMPT_COLUMNS, toAttemptRow, toAttempts } from '../../mappers/attempt.mapper';

const TABLE = 'attempts';

/**
 * Append only. There is no `update` and no `delete` here because the port
 * offers neither and 003 grants the client neither — an attempt is the evidence
 * every score is derived from, and evidence that can be edited is not evidence.
 */
export class SupabaseAttemptRepository implements IAttemptRepository {
  constructor(private readonly db: IDatabase) {}

  async append(attempt: Attempt): Promise<Attempt> {
    await this.db.insert(TABLE, [toAttemptRow(attempt)]);

    return attempt;
  }

  async findBySession(sessionId: string): Promise<readonly Attempt[]> {
    return toAttempts(
      await this.db.select({
        table: TABLE,
        columns: ATTEMPT_COLUMNS,
        eq: { session_id: sessionId },
        orderBy: { column: 'created_at', ascending: true },
      }),
    );
  }

  async findByProfile(profileId: string, limit: number): Promise<readonly Attempt[]> {
    return toAttempts(
      await this.db.select({
        table: TABLE,
        columns: ATTEMPT_COLUMNS,
        eq: { profile_id: profileId },
        orderBy: { column: 'created_at', ascending: false },
        limit,
      }),
    );
  }
}
