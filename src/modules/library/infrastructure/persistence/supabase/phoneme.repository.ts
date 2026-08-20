import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type Phoneme } from '../../../domain/entities/phoneme';
import { type IPhonemeRepository } from '../../../domain/repositories/phoneme-repository';
import { PHONEME_COLUMNS, toPhonemes } from '../../mappers/phoneme.mapper';

export class SupabasePhonemeRepository implements IPhonemeRepository {
  constructor(private readonly db: IDatabase) {}

  async findByIds(ids: readonly string[]): Promise<readonly Phoneme[]> {
    return toPhonemes(
      await this.db.select({
        table: 'phonemes',
        columns: PHONEME_COLUMNS,
        whereIn: { column: 'id', values: ids },
      }),
    );
  }

  /** All 44, grouped by type then symbol — the matrix's row order. */
  async listAll(): Promise<readonly Phoneme[]> {
    return toPhonemes(
      await this.db.select({
        table: 'phonemes',
        columns: PHONEME_COLUMNS,
        orderBy: { column: 'symbol', ascending: true },
      }),
    );
  }
}
