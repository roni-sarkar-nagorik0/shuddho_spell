import { type Word } from '../entities/word';

export interface IWordSearch {
  /** The last `text` of the previous page. Omit for the first page. */
  readonly after?: string;
  readonly limit: number;
  /** Case-insensitive substring of the headword. */
  readonly contains?: string;
  readonly weekIndex?: number;
  readonly partOfSpeech?: string;
  readonly ruleFamilyId?: string;
}

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

  /**
   * A page of the library, **keyset-paginated on `words.text`**.
   *
   * `text` is unique in 002, which is what makes it a safe cursor: "everything
   * after `subtle`" is one row's worth of state and cannot drift. An offset
   * would repeat or skip rows whenever the content pipeline seeded a word
   * alphabetically behind the reader.
   *
   * The filters are optional and combine with AND. `limit` is a page size, and
   * the caller asks for one more than it means to show — that extra row is how
   * it learns whether a next page exists without a second count query.
   */
  readonly search: (options: IWordSearch) => Promise<readonly Word[]>;
}
