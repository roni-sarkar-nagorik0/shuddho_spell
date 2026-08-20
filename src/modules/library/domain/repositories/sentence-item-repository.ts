import { type SentenceItem } from '../entities/sentence-item';

export const SENTENCE_ITEM_REPOSITORY = Symbol('SENTENCE_ITEM_REPOSITORY');

export interface ISentenceItemRepository {
  readonly findById: (id: string) => Promise<SentenceItem | null>;
  readonly findByIds: (ids: readonly string[]) => Promise<readonly SentenceItem[]>;

  /**
   * Every sentence item, capped.
   *
   * Unlike `words`, `sentence_items` carries no week: a sentence is placed by
   * `program_day_items`, not by a column. Walking the programme's days to
   * filter them would be 28 reads to build one exam paper, so the exam draws
   * from the whole set and lets the blueprint's weakness ranking choose.
   */
  readonly listAll: (limit: number) => Promise<readonly SentenceItem[]>;
}
