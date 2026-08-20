import { MasteryRecord } from '../entities/mastery-record';
import { type MasteryDimension } from '../value-objects/mastery-dimension';

/** One attempt's contribution to one dimension. */
export interface IMasteryObservation {
  readonly dimension: MasteryDimension;
  readonly dimensionId: string;
  readonly isCorrect: boolean;
}

/**
 * Rolls attempts up into per-phoneme and per-rule-family accuracy.
 *
 * One attempt produces several observations, which is the point: spelling
 * "running" wrong is evidence about the doubling rule *and* about every phoneme
 * in the word. The caller fans an attempt out into observations; this folds
 * them into the records.
 *
 * Pure. It is handed the records it may change and returns new ones — it does
 * not read a repository, so the same code serves a live submission and a
 * backfill over a year of history.
 */
export class MasteryCalculator {
  /**
   * Applies observations to the records they belong to.
   *
   * Returns **only the records that changed**, so a caller can write exactly
   * those back. A dimension with no observation this time is not returned
   * unchanged and then rewritten — that would bump `last_updated_at` on rows
   * nothing happened to, and "when did I last practise this" is a question the
   * progress screen answers from that column.
   */
  apply(
    existing: readonly MasteryRecord[],
    observations: readonly IMasteryObservation[],
    now: Date,
    newId: (observation: IMasteryObservation) => string,
    profileId: string,
  ): readonly MasteryRecord[] {
    const touched = new Map<string, MasteryRecord>();

    for (const observation of observations) {
      const key = `${observation.dimension}:${observation.dimensionId}`;

      const current =
        touched.get(key) ??
        existing.find(
          (record) =>
            record.dimension === observation.dimension &&
            record.dimensionId === observation.dimensionId,
        ) ??
        new MasteryRecord({
          id: newId(observation),
          profileId,
          dimension: observation.dimension,
          dimensionId: observation.dimensionId,
          attempts: 0,
          correct: 0,
          lastUpdatedAt: now,
        });

      touched.set(key, current.record(observation.isCorrect, now));
    }

    return [...touched.values()];
  }

  /**
   * The dimensions worth showing a learner as work to do, weakest first.
   *
   * Ordering by accuracy alone would put a 0%-of-3 above a 50%-of-40, which is
   * backwards as advice: the second is a real, measured gap and the first is
   * three unlucky attempts. `isWeakness` already demands evidence; among those
   * that qualify, lowest accuracy first is the right order.
   */
  weaknesses(records: readonly MasteryRecord[]): readonly MasteryRecord[] {
    return [...records]
      .filter((record) => record.isWeakness())
      .sort((left, right) => left.accuracy().value - right.accuracy().value);
  }
}
