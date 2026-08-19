import { type SentenceItem } from '../entities/sentence-item';

export const SENTENCE_ITEM_REPOSITORY = Symbol('SENTENCE_ITEM_REPOSITORY');

export interface ISentenceItemRepository {
  readonly findById: (id: string) => Promise<SentenceItem | null>;
  readonly findByIds: (ids: readonly string[]) => Promise<readonly SentenceItem[]>;
}
