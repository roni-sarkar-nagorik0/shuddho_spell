import { type ConfusionKind } from '../value-objects/confusion-kind';
import { type IPhonemeConfusion } from '../value-objects/phoneme-confusion';
import { BENGALI_CONFUSIONS } from './bengali-confusions';

/**
 * Lookup over the confusion table.
 *
 * The table is injected rather than reached for, so a test can score against
 * three rows and a future content pipeline can score against fifty without the
 * scorer knowing either happened. The default is the real table because every
 * caller in the app wants it and threading it through the composition root to
 * say so would be ceremony.
 */
export class BengaliConfusionMap {
  constructor(private readonly entries: readonly IPhonemeConfusion[] = BENGALI_CONFUSIONS) {}

  all(): readonly IPhonemeConfusion[] {
    return this.entries;
  }

  byId(id: string): IPhonemeConfusion | null {
    return this.entries.find((entry) => entry.id === id) ?? null;
  }

  ofKind(kind: ConfusionKind): readonly IPhonemeConfusion[] {
    return this.entries.filter((entry) => entry.kind === kind);
  }

  /** Every confusion that could deform this sound. */
  forExpected(symbol: string): readonly IPhonemeConfusion[] {
    return this.entries.filter((entry) => entry.expected === symbol);
  }

  /**
   * The confusion that explains hearing `heard` where `expected` belonged, or
   * null when there is none.
   *
   * Null is the answer that keeps diagnoses honest: an unrelated word must
   * score low **and say nothing**, because naming a fix for an error the
   * learner did not make is worse than naming no fix at all.
   */
  explain(expected: string, heard: string): IPhonemeConfusion | null {
    return (
      this.entries.find(
        (entry) => entry.expected === expected && entry.commonlyHeardAs.includes(heard),
      ) ?? null
    );
  }

  /** Partial credit for a known confusion; nothing for an unknown swap. */
  creditFor(expected: string, heard: string): number | null {
    return this.explain(expected, heard)?.partialCredit ?? null;
  }
}
