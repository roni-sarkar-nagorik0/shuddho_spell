import { type MasteryRecord } from '../entities/mastery-record';

export const MASTERY_REPOSITORY = Symbol('MASTERY_REPOSITORY');

export interface IMasteryRepository {
  readonly findByProfile: (profileId: string) => Promise<readonly MasteryRecord[]>;

  /**
   * Writes several records as one call. `MasteryCalculator` returns only what
   * an attempt changed, and one attempt can touch several phonemes and a rule
   * family at once — a per-record write would make a single dictation answer
   * six round trips.
   */
  readonly saveMany: (records: readonly MasteryRecord[]) => Promise<void>;
}
