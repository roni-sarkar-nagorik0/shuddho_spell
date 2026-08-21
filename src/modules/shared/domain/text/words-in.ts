/**
 * Splitting English into whole words, once, for everything that needs to ask
 * whether a sentence uses a particular one.
 *
 * It exists because two entities were about to answer that question with two
 * regexes. They would have agreed on the day they were written and disagreed
 * the first time one of them learnt about hyphens — and the disagreement would
 * have shown up as the landing page offering *handle* as an example of *hand*,
 * which is a lesson in the wrong word rather than a visible failure.
 *
 * A word is letters and apostrophes. That keeps "don't" whole — so `t` is not a
 * word inside it — and it is the same boundary `normaliseAnswer` implies when
 * it forgives case and spacing and nothing else.
 */

const NOT_A_WORD = /[^a-z']+/u;

/** The whole words of `text`, lower-cased, punctuation dropped. */
export function wordsIn(text: string): readonly string[] {
  return text
    .toLowerCase()
    .split(NOT_A_WORD)
    .filter((token) => token !== '');
}

/**
 * Whether `text` uses `word` as a **whole word**.
 *
 * The empty string is false rather than true. A blank target matching every
 * sentence is the kind of answer that is technically defensible and always
 * wrong at the call site.
 */
export function usesWord(text: string, word: string): boolean {
  const target = word.trim().toLowerCase();

  return target !== '' && wordsIn(text).includes(target);
}

/** How many whole words `text` has. What "a longer sentence" is measured in. */
export function wordCount(text: string): number {
  return wordsIn(text).length;
}
