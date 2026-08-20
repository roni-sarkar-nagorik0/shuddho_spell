import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type StreakRecord } from '../../../domain/entities/streak-record';
import { type IStreakRepository } from '../../../domain/repositories/streak-repository';
import {
  STREAK_RECORD_COLUMNS,
  toStreakRecord,
  toStreakRecordRow,
} from '../../mappers/streak-record.mapper';

const TABLE = 'streak_records';

export class SupabaseStreakRepository implements IStreakRepository {
  constructor(private readonly db: IDatabase) {}

  async findByProfile(profileId: string): Promise<StreakRecord | null> {
    return toStreakRecord(
      await this.db.selectOne({
        table: TABLE,
        columns: STREAK_RECORD_COLUMNS,
        eq: { profile_id: profileId },
      }),
    );
  }

  /**
   * Upsert rather than update: a learner's first ever lesson completion creates
   * this row, and the use case should not have to know whether it is the first.
   */
  async save(record: StreakRecord): Promise<StreakRecord> {
    await this.db.upsert(TABLE, [toStreakRecordRow(record)], {
      onConflict: 'profile_id',
      ignoreDuplicates: false,
    });

    return record;
  }
}
