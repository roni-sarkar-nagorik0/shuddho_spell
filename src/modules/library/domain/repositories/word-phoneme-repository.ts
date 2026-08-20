import { type IWordPhonemeLink } from '../value-objects/word-phoneme-link';

export const WORD_PHONEME_REPOSITORY = Symbol('WORD_PHONEME_REPOSITORY');

/**
 * The stored grapheme-to-phoneme mapping, read back.
 *
 * `word_phonemes` has existed since 002 with a comment saying it drives
 * per-phoneme mastery, and until now nothing read it. This is what does.
 */
export interface IWordPhonemeRepository {
  /**
   * Batched for the same reason `IWordRepository.findByIds` is: a lesson day
   * is a list of words, and a query per word is the N+1 the Phase 5 gate
   * asserts against. Returned in `(word_id, position)` order.
   */
  readonly findByWordIds: (wordIds: readonly string[]) => Promise<readonly IWordPhonemeLink[]>;
}
