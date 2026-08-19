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
}
