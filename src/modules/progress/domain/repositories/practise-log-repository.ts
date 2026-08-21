export const PRACTISE_LOG_REPOSITORY = Symbol('PRACTISE_LOG_REPOSITORY');

/**
 * Where a practised word came from.
 *
 * `all` is a third value rather than "no filter", because the screen offers it
 * as a choice alongside the other two and an absent filter would be a fourth
 * state meaning the same thing.
 */
export const PRACTISE_SOURCES = Object.freeze(['all', 'course', 'demo'] as const);

export type PractiseSource = (typeof PRACTISE_SOURCES)[number];

/**
 * One word, as the log shows it. Plain data: 022 groups, this carries.
 *
 * Not `IPractisedWordRow`. A `…Row` in this project means a hand-written mirror
 * of a database table, snake_case, confined to `infrastructure/rows/` — and
 * `rows.test.ts` enforces that by name. This is camelCase domain data that
 * happens to arrive a row at a time, which is a different thing wearing a
 * similar word.
 */
export interface IPractisedWord {
  readonly wordId: string;
  readonly text: string;
  readonly ipa: string;
  readonly banglaSound: string;
  readonly tries: number;
  readonly settled: boolean;
  /** The most recent attempt on this word, from any source. */
  readonly lastAt: Date;
}

export interface IPractisedWordPage {
  readonly words: readonly IPractisedWord[];
  /** Distinct words matching the filter — the whole set, not this page. */
  readonly totalWords: number;
}

export interface IPractiseLogRepository {
  /**
   * One page of distinct words, newest first.
   *
   * Offset paging rather than the keyset the library uses, and the difference
   * is the sort key: the library pages on `words.text`, which is unique and
   * fixed, so "everything after `subtle`" is stable. This pages on the most
   * recent attempt, which **moves** — practise a word again and it jumps to the
   * front. There is no cursor that survives that, and a learner working while
   * paging is the ordinary case rather than a corner one. Offset repeats or
   * skips a row when the order shifts under them, which is the smaller wrong
   * answer than a cursor that cannot be honoured at all.
   */
  readonly page: (
    profileId: string,
    source: PractiseSource,
    limit: number,
    offset: number,
  ) => Promise<IPractisedWordPage>;
}
