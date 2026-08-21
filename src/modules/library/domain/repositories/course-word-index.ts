export const COURSE_WORD_INDEX = Symbol('COURSE_WORD_INDEX');

/**
 * Which words the 28-day course actually teaches.
 *
 * The word families and the programme are two separate corpora — see
 * `content/word-families/schema.ts` for why — and this port is the only bridge
 * between them. It answers one question and returns a boolean, because that is
 * the only thing the family screen needs to know: whether to offer a link to
 * the library row where this word's IPA has been checked.
 *
 * Deliberately **not** `IWordRepository`. That port reads `words` over the
 * database, and asking it would turn a page render into a 2,299-row lookup to
 * discover something the build already knows. The same words are in both
 * places because the seeder puts them there; reading the source is reading the
 * same fact one step earlier.
 */
export interface ICourseWordIndex {
  readonly has: (word: string) => boolean;
  /** How many words the course teaches. Used to state the two corpora apart. */
  readonly size: number;
}
