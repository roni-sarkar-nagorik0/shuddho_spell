import { ALPHABET, type IAlphabetLetter } from './alphabet';

/**
 * The letters sorted by the sound their **name** ends on.
 *
 * **Why this is a section and not a decoration.** Spelling aloud is the thing
 * this course is for, and the letters do not fail one at a time — they fail in
 * families. Eight of the twenty-six rhyme on /iː/, and the entire difference
 * between *B* and *V*, or *C* and *T*, or *P* and *B*, is a single consonant at
 * the front of eight otherwise identical names. Say *V* with the ভ a Bengali
 * speaker's mouth reaches for and it becomes *B*: the name is now a different
 * letter, and the word being spelled is a different word.
 *
 * The grouping is **derived, never typed out.** Each family is defined by one
 * IPA nucleus, and a letter joins the first family whose nucleus appears in its
 * `nameIpa` — the same twenty-six entries the strip above already renders. A
 * hand-written list of members would be a second copy of `alphabet.ts` that
 * disagrees with it the first time either is edited, and the disagreement would
 * be invisible: both lists would still render.
 *
 * Order matters and is not alphabetical. `eɪ` is tried before `e` or `aɪ`
 * because *H* is /eɪtʃ/ and would otherwise land with *F* and *L*; `uː` before
 * `ə` because *W* is /ˈdʌbəljuː/ and belongs with *Q* and *U*. Getting that
 * order wrong is exactly what the completeness test below catches.
 */
export interface ILetterFamily {
  /** The shared sound, as it is written in the letters' own transcriptions. */
  readonly nucleus: string;
  /** What to call it out loud, for a heading a visitor can read. */
  readonly rhymesWith: string;
  readonly letters: readonly IAlphabetLetter[];
}

/**
 * The nuclei, in the order a letter is tested against them.
 *
 * Longest and most specific first. A shorter nucleus that is a substring of a
 * longer one — `e` inside `eɪ`, `ɪ` inside `aɪ` — must come after it or it will
 * claim letters that belong elsewhere.
 */
const NUCLEI: readonly { readonly nucleus: string; readonly rhymesWith: string }[] = [
  { nucleus: 'eɪ', rhymesWith: 'day' },
  { nucleus: 'aɪ', rhymesWith: 'my' },
  { nucleus: 'iː', rhymesWith: 'see' },
  { nucleus: 'uː', rhymesWith: 'you' },
  { nucleus: 'əʊ', rhymesWith: 'go' },
  { nucleus: 'ɑː', rhymesWith: 'car' },
  { nucleus: 'e', rhymesWith: 'bed' },
];

export const LETTER_FAMILIES: readonly ILetterFamily[] = NUCLEI.map(
  ({ nucleus, rhymesWith }, index) => ({
    nucleus,
    rhymesWith,
    letters: ALPHABET.filter((letter) => familyIndexOf(letter) === index),
  }),
).filter((family) => family.letters.length > 0);

/** Which family a letter belongs to, or -1 if no nucleus matched it. */
export function familyIndexOf(letter: IAlphabetLetter): number {
  return NUCLEI.findIndex(({ nucleus }) => letter.nameIpa.includes(nucleus));
}

/**
 * The letters in a family that Bangla has no equivalent sound for.
 *
 * This is where the section earns its place. A family is already a set of names
 * that sound alike; the ones marked here are the members a Bengali speaker is
 * *also* substituting. Eight letters that rhyme is a memory problem. Eight
 * letters that rhyme, three of which you are pronouncing with a different
 * consonant than the one you mean, is why a spelled-out word arrives wrong.
 */
export function substitutedIn(family: ILetterFamily): readonly IAlphabetLetter[] {
  return family.letters.filter((letter) => letter.substitution !== null);
}
