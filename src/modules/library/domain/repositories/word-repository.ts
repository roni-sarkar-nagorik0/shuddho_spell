import { type Word } from '../entities/word';

export const WORD_REPOSITORY = Symbol('WORD_REPOSITORY');

export interface IWordRepository {
  readonly findById: (id: string) => Promise<Word | null>;

  /**
   * Batched deliberately. A lesson day is a list of word ids, and fetching them
   * one at a time is the N+1 the Phase 5 gate asserts against — the query count
   * for a day has to be a constant, not a function of how many words it holds.
   */
  readonly findByIds: (ids: readonly string[]) => Promise<readonly Word[]>;

  /**
   * Every word the course has taught by a given week — the pool an exam draws
   * from. `week_index` is on the row, so this is one filtered read rather than
   * a walk over the programme's days collecting ids.
   */
  readonly findUpToWeek: (weekIndex: number) => Promise<readonly Word[]>;
}
