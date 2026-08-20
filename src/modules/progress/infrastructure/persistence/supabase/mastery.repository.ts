import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type MasteryRecord } from '../../../domain/entities/mastery-record';
import { type IMasteryRepository } from '../../../domain/repositories/mastery-repository';
import {
  MASTERY_RECORD_COLUMNS,
  toMasteryRecordRow,
  toMasteryRecords,
} from '../../mappers/mastery-record.mapper';

const TABLE = 'mastery_records';

export class SupabaseMasteryRepository implements IMasteryRepository {
  constructor(private readonly db: IDatabase) {}

  async findByProfile(profileId: string): Promise<readonly MasteryRecord[]> {
    return toMasteryRecords(
      await this.db.select({
        table: TABLE,
        columns: MASTERY_RECORD_COLUMNS,
        eq: { profile_id: profileId },
      }),
    );
  }

  /**
   * One call for the several records an answer touched. A per-record write
   * would make a single construction attempt — which can credit an article, a
   * preposition and a tense — three round trips.
   */
  async saveMany(records: readonly MasteryRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    await this.db.upsert(TABLE, records.map(toMasteryRecordRow), {
      onConflict: 'profile_id, dimension, dimension_id',
      ignoreDuplicates: false,
    });
  }
}
