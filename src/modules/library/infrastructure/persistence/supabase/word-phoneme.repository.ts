import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type IWordPhonemeRepository } from '../../../domain/repositories/word-phoneme-repository';
import { type IWordPhonemeLink } from '../../../domain/value-objects/word-phoneme-link';
import { WORD_PHONEME_COLUMNS, toWordPhonemeLinks } from '../../mappers/word-phoneme.mapper';

export class SupabaseWordPhonemeRepository implements IWordPhonemeRepository {
  constructor(private readonly db: IDatabase) {}

  /**
   * Ordered by `position` so the caller never has to sort. Ordering here rather
   * than in the domain is not a leak: the unique constraint on
   * `(word_id, position)` is what makes the order meaningful, and it lives in
   * the same place as the index that serves it.
   */
  async findByWordIds(wordIds: readonly string[]): Promise<readonly IWordPhonemeLink[]> {
    return toWordPhonemeLinks(
      await this.db.select({
        table: 'word_phonemes',
        columns: WORD_PHONEME_COLUMNS,
        whereIn: { column: 'word_id', values: wordIds },
        orderBy: { column: 'position', ascending: true },
      }),
    );
  }
}
