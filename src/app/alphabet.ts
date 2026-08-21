/**
 * The twenty-six letters, as a Bengali speaker has to say them.
 *
 * **Why this is on a page about spelling.** Dictation is somebody reading
 * letters back, and the letters themselves are the first thing that goes wrong:
 * a learner who says the name of *W* as *ভ* has already lost the word before
 * they reach it, and the same substitution that turns *west* into *bhest* turns
 * the letter's own name into the wrong letter. The names are the smallest unit
 * of the course, and until now the front door never showed them.
 *
 * `nameIpa` is the letter's **name**, not its sound — *H* is /eɪtʃ/ and spells
 * /h/, and confusing the two is how a learner ends up spelling *aitch*. Both
 * are here for exactly that reason.
 *
 * `substitution` is **copied verbatim from `content/phonemes.ts`**, the same
 * forty-four entries migration `010_seed_reference` seeds and the library page
 * reads. It is present on exactly the six letters whose characteristic sound
 * Bangla does not have — t, d, v, z, r, w — because those are the six the
 * content records a substitution for. It is not written here, and the absence
 * on the other twenty is data rather than an omission: the letters are quoted
 * from the reviewed source or they say nothing.
 *
 * The Bangla renderings of the *names* are the one thing authored for this
 * file. They are transliterations of an English letter name into Bangla script,
 * the same job `words.bangla_sound` does for every word in the corpus.
 */
export interface IAlphabetLetter {
  readonly letter: string;
  /** The letter's name in IPA — what you say when you read the letter aloud. */
  readonly nameIpa: string;
  /** That name in Bangla script. */
  readonly nameBangla: string;
  /** The sound the letter most characteristically spells. */
  readonly sound: string;
  /**
   * What a Bengali speaker produces instead, where the sound is one Bangla does
   * not have. Null for the twenty letters whose sound Bangla already owns.
   */
  readonly substitution: string | null;
}

export const ALPHABET: readonly IAlphabetLetter[] = [
  { letter: 'A', nameIpa: 'eɪ', nameBangla: 'এই', sound: 'æ', substitution: null },
  { letter: 'B', nameIpa: 'biː', nameBangla: 'বি', sound: 'b', substitution: null },
  { letter: 'C', nameIpa: 'siː', nameBangla: 'সি', sound: 's', substitution: null },
  {
    letter: 'D',
    nameIpa: 'diː',
    nameBangla: 'ডি',
    sound: 'd',
    substitution: 'Retroflex ড is substituted for the same reason as the voiceless one.',
  },
  { letter: 'E', nameIpa: 'iː', nameBangla: 'ই', sound: 'e', substitution: null },
  { letter: 'F', nameIpa: 'ef', nameBangla: 'এফ', sound: 'f', substitution: null },
  { letter: 'G', nameIpa: 'dʒiː', nameBangla: 'জি', sound: 'ɡ', substitution: null },
  { letter: 'H', nameIpa: 'eɪtʃ', nameBangla: 'এইচ', sound: 'h', substitution: null },
  { letter: 'I', nameIpa: 'aɪ', nameBangla: 'আই', sound: 'ɪ', substitution: null },
  { letter: 'J', nameIpa: 'dʒeɪ', nameBangla: 'জেই', sound: 'dʒ', substitution: null },
  { letter: 'K', nameIpa: 'keɪ', nameBangla: 'কেই', sound: 'k', substitution: null },
  { letter: 'L', nameIpa: 'el', nameBangla: 'এল', sound: 'l', substitution: null },
  { letter: 'M', nameIpa: 'em', nameBangla: 'এম', sound: 'm', substitution: null },
  { letter: 'N', nameIpa: 'en', nameBangla: 'এন', sound: 'n', substitution: null },
  { letter: 'O', nameIpa: 'əʊ', nameBangla: 'ওউ', sound: 'ɒ', substitution: null },
  { letter: 'P', nameIpa: 'piː', nameBangla: 'পি', sound: 'p', substitution: null },
  { letter: 'Q', nameIpa: 'kjuː', nameBangla: 'কিউ', sound: 'k', substitution: null },
  {
    letter: 'R',
    nameIpa: 'ɑː',
    nameBangla: 'আর',
    sound: 'r',
    substitution:
      'Bangla র is a tap or a trill and is sounded wherever it is written, so car and park gain an audible r.',
  },
  { letter: 'S', nameIpa: 'es', nameBangla: 'এস', sound: 's', substitution: null },
  {
    letter: 'T',
    nameIpa: 'tiː',
    nameBangla: 'টি',
    sound: 't',
    substitution:
      'Bangla has dental ত and retroflex ট and nothing between them, so ট is substituted and t acquires a retroflex colour.',
  },
  { letter: 'U', nameIpa: 'juː', nameBangla: 'ইউ', sound: 'ʌ', substitution: null },
  {
    letter: 'V',
    nameIpa: 'viː',
    nameBangla: 'ভি',
    sound: 'v',
    substitution: 'Absent from Bangla. ভ or ব is substituted, so very becomes bhery.',
  },
  {
    letter: 'W',
    nameIpa: 'ˈdʌbəljuː',
    nameBangla: 'ডাবল-ইউ',
    sound: 'w',
    substitution:
      'Bangla has [w] only as a glide inside a syllable, never as a consonant of its own, so ভ or ও is substituted and west becomes bhest.',
  },
  { letter: 'X', nameIpa: 'eks', nameBangla: 'এক্স', sound: 'ks', substitution: null },
  { letter: 'Y', nameIpa: 'waɪ', nameBangla: 'ওয়াই', sound: 'j', substitution: null },
  {
    letter: 'Z',
    nameIpa: 'zed',
    nameBangla: 'জেড',
    sound: 'z',
    substitution: 'Absent from Bangla. জ is substituted, so zoo becomes joo.',
  },
];

/**
 * The six letters carrying a substitution, counted rather than written down.
 *
 * The section's heading says how many there are, and a number typed into a
 * sentence beside a list is a number that goes stale the first time the list
 * changes. Deriving it means the prose cannot lie about the data above it.
 */
export const LETTERS_BANGLA_LACKS = ALPHABET.filter(
  (entry) => entry.substitution !== null,
).length;
