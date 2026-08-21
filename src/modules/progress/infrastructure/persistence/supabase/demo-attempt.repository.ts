import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type DemoAttempt } from '../../../domain/entities/demo-attempt';
import { type IDemoAttemptRepository } from '../../../domain/repositories/demo-attempt-repository';
import { DEMO_ATTEMPT_COLUMNS, toDemoAttempts } from '../../mappers/demo-attempt.mapper';

const TABLE = 'demo_attempts';

/**
 * Backed by the service client, like every repository here.
 *
 * 021 gives `authenticated` a select policy on their own rows and **no insert
 * policy at all**, so the write below is the only way a row gets in — after
 * `RecordDemoAttemptUseCase` has decided whether the answer was right. That is
 * the arrangement, not an accident of which client was to hand.
 */
export class SupabaseDemoAttemptRepository implements IDemoAttemptRepository {
  constructor(private readonly db: IDatabase) {}

  async append(attempt: DemoAttempt): Promise<DemoAttempt> {
    await this.db.insert(TABLE, [
      {
        id: attempt.id,
        profile_id: attempt.profileId,
        word_id: attempt.wordId,
        submitted_value: attempt.submittedValue,
        is_correct: attempt.isCorrect,
        created_at: attempt.createdAt.toISOString(),
      },
    ]);

    // The entity as written. There is nothing the database decides here that
    // the caller does not already hold — no default, no trigger that rewrites a
    // value — so a read-back would be a round trip for its own sake.
    return attempt;
  }

  async findSince(
    profileId: string,
    since: Date,
    limit: number,
  ): Promise<readonly DemoAttempt[]> {
    return toDemoAttempts(
      await this.db.select({
        table: TABLE,
        columns: DEMO_ATTEMPT_COLUMNS,
        eq: { profile_id: profileId },
        gte: { column: 'created_at', value: since.toISOString() },
        orderBy: { column: 'created_at', ascending: false },
        limit,
      }),
    );
  }
}
