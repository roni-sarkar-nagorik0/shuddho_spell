import { type Phoneme } from '../entities/phoneme';

export const PHONEME_REPOSITORY = Symbol('PHONEME_REPOSITORY');

export interface IPhonemeRepository {
  readonly findByIds: (ids: readonly string[]) => Promise<readonly Phoneme[]>;

  /** All 44. The mastery matrix's rows. */
  readonly listAll: () => Promise<readonly Phoneme[]>;
}
