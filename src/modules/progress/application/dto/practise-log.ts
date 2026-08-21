import { type PractiseSource } from '../../domain/repositories/practise-log-repository';

/** One word on the log, with its sound. `lastAt` is ISO — it crosses to a page. */
export interface IPractiseLogWord {
  readonly wordId: string;
  readonly text: string;
  readonly ipa: string;
  readonly banglaSound: string;
  readonly tries: number;
  readonly settled: boolean;
  readonly lastAt: string;
}

/**
 * One page of the learner's practice history.
 *
 * `page` and `pageCount` rather than a cursor: this is a screen with numbered
 * links, and a learner who wants to know how much they have done wants the
 * total. See the port for why a cursor is the wrong shape for this ordering.
 */
export interface IPractiseLog {
  readonly words: readonly IPractiseLogWord[];
  readonly source: PractiseSource;
  /** 1-based, clamped to the range that exists. */
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  /** Distinct words matching the filter — the whole set, not this page. */
  readonly totalWords: number;
}
