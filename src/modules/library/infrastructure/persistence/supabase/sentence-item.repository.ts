import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type SentenceItem } from '../../../domain/entities/sentence-item';
import { type ISentenceItemRepository } from '../../../domain/repositories/sentence-item-repository';
import {
  SENTENCE_ITEM_COLUMNS,
  toSentenceItem,
  toSentenceItems,
} from '../../mappers/sentence-item.mapper';

export class SupabaseSentenceItemRepository implements ISentenceItemRepository {
  constructor(private readonly db: IDatabase) {}

  async findById(id: string): Promise<SentenceItem | null> {
    return toSentenceItem(
      await this.db.selectOne({ table: 'sentence_items', columns: SENTENCE_ITEM_COLUMNS, eq: { id } }),
    );
  }

  async findByIds(ids: readonly string[]): Promise<readonly SentenceItem[]> {
    return toSentenceItems(
      await this.db.select({
        table: 'sentence_items',
        columns: SENTENCE_ITEM_COLUMNS,
        whereIn: { column: 'id', values: ids },
      }),
    );
  }

  /**
   * `%` and `_` are stripped rather than escaped, exactly as the word
   * repository's search does. Both are wildcards in `like`, neither appears in
   * a word this is ever called with, and stripping keeps the two search paths
   * reading the same way.
   */
  async findContaining(word: string, limit: number): Promise<readonly SentenceItem[]> {
    const term = word.replace(/[%_]/gu, '');

    if (term === '') {
      return [];
    }

    return toSentenceItems(
      await this.db.select({
        table: 'sentence_items',
        columns: SENTENCE_ITEM_COLUMNS,
        ilike: { column: 'english_text', pattern: `%${term}%` },
        limit,
      }),
    );
  }

  async listAll(limit: number): Promise<readonly SentenceItem[]> {
    return toSentenceItems(
      await this.db.select({
        table: 'sentence_items',
        columns: SENTENCE_ITEM_COLUMNS,
        limit,
      }),
    );
  }
}
