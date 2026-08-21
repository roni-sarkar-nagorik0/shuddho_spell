import { wordsIn } from './words-in';

/**
 * Whether a piece of English uses a word — in any form the learner is likely to
 * reach for.
 *
 * The demo asks somebody to put *visit* into a sentence and they say "I
 * **visited** my friend yesterday". That is the correct answer. A whole-word
 * match would call it a miss, tell them they did not use the word, and be
 * wrong about the one thing the exercise was testing.
 *
 * **The endings below are not a stemmer and are not trying to be.** Porter and
 * its relatives strip aggressively enough that *organ* matches *organisation*,
 * which on a page about precision is exactly the wrong kind of generosity. This
 * goes the other way: it **generates** the forms a regular English word takes
 * and asks whether the sentence contains one of them. Nothing is stripped, so
 * nothing can be over-stripped.
 *
 * The three spelling adjustments are the course's own rules — `y_to_i`,
 * `doubling_1_1_1` and the silent-e drop that `content/rule-families.ts`
 * teaches — applied in the direction the learner applies them. An irregular
 * verb (*go* → *went*) is not covered and deliberately is not guessed at: the
 * honest answer for those is that the checker did not recognise it, and the
 * caller says so rather than marking the learner wrong.
 */

/** The regular endings. `-d` is separate from `-ed` for the silent-e stems. */
const SUFFIXES: readonly string[] = ['s', 'es', 'ed', 'd', 'ing', 'ings', 'er', 'ers', 'est'];

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/**
 * Every form of `word` this will accept, lower-cased and deduplicated.
 *
 * Exported because it is the thing worth testing directly: a list of strings is
 * inspectable in a way "did the match work" is not.
 */
export function formsOf(word: string): readonly string[] {
  const stem = word.trim().toLowerCase();

  if (stem === '') {
    return [];
  }

  const stems = [stem, ...spellingVariants(stem)];
  const forms = new Set<string>([stem]);

  for (const base of stems) {
    for (const suffix of SUFFIXES) {
      forms.add(base + suffix);
    }
  }

  return [...forms];
}

/**
 * The stems English produces before an ending is added.
 *
 * - *hope* → *hop*, so *hoping* is reachable (the silent e is dropped)
 * - *stop* → *stopp*, so *stopping* is reachable (1-1-1 doubling)
 * - *try* → *tri*, so *tried* and *tries* are reachable (y to i)
 *
 * Each is generated whether or not it applies — *cat* yields *catt*, which
 * matches nothing and costs one string. Deciding which rule applies would mean
 * knowing the word's stress and syllable count, and being wrong about that is
 * how a checker starts refusing correct answers.
 */
function spellingVariants(stem: string): readonly string[] {
  const variants: string[] = [];
  const last = stem.at(-1) ?? '';
  const secondLast = stem.at(-2) ?? '';
  const thirdLast = stem.at(-3) ?? '';

  if (last === 'e') {
    variants.push(stem.slice(0, -1));
  }

  if (last === 'y' && !VOWELS.has(secondLast)) {
    variants.push(`${stem.slice(0, -1)}i`);
  }

  // Consonant–vowel–consonant, the shape `doubling_1_1_1` is about.
  if (!VOWELS.has(last) && last !== 'y' && VOWELS.has(secondLast) && !VOWELS.has(thirdLast)) {
    variants.push(stem + last);
  }

  return variants;
}

/**
 * Whether `text` uses `word` or one of its regular forms, as a whole word.
 *
 * Whole-word throughout: *visits* is a form of *visit*, but *visitor* is a
 * different word and *revisit* is not this word at all.
 */
export function usesWordOrForm(text: string, word: string): boolean {
  const forms = new Set(formsOf(word));

  return forms.size > 0 && wordsIn(text).some((token) => forms.has(token));
}
