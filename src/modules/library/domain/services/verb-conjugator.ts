/**
 * The spelling rules that turn a base form into the other four.
 *
 * **This is the feature, not a helper for it.** A screen that printed
 * `stop / stopped / stopped / stopping / stops` teaches five words; a screen
 * that says *the p doubles because stop is one syllable ending
 * consonant-vowel-consonant* teaches `plan`, `drop`, `beg` and every verb the
 * learner meets after leaving it. So every derivation returns the **rule it
 * used** beside the form, and the rule name reaches the screen.
 *
 * **Measured, not asserted.** The corpus this serves is a thousand-verb
 * reference list, and `content:validate` runs every base form in it through
 * these three functions and compares the result with the list. 963 of the 998
 * come out right; the 35 that do not are recorded as overrides in the content,
 * and the same check fails the build if an override is ever added where the
 * rule already worked. That number is why the corpus can store one word per
 * regular verb.
 *
 * **What the rules cannot know.** English doubles a final consonant when the
 * last syllable is *stressed* — `admit → admitting` but `visit → visiting` —
 * and stress is not recoverable from spelling. So `double` fires only for
 * single-syllable verbs, where it is safe, and every multi-syllable doubling
 * (`admit`, `prefer`, `occur`, `control`) is an override. That is the honest
 * shape of the gap: 21 of the 35 exceptions are this one rule, and pretending
 * otherwise would mean a screen confidently teaching `admiting`.
 */

export const VERB_RULES = Object.freeze([
  /** Nothing happened but the ending: `work → worked`. */
  'add',
  /** The silent e went: `hope → hoped`, `make → making`. */
  'drop-e',
  /** A consonant doubled: `stop → stopped`, `run → running`. */
  'double',
  /** A y became an i: `try → tried`, `carry → carries`. */
  'y-to-i',
  /** `-ie` became a y: `die → dying`, `lie → lying`. */
  'ie-to-y',
  /** A hissing ending took `-es`: `watch → watches`, `go → goes`. */
  'add-es',
  /** No rule reaches it. `be → was`, `go → went` — it must be learnt. */
  'irregular',
] as const);

export type VerbRule = (typeof VERB_RULES)[number];

export interface IDerivedForm {
  readonly form: string;
  readonly rule: VerbRule;
}

const VOWELS = 'aeiou';

/** Vowel groups, which is close enough to syllables for the doubling test. */
function syllables(word: string): number {
  return (word.match(/[aeiouy]+/gu) ?? []).length;
}

/**
 * Consonant–vowel–consonant, one syllable, and not ending in w, x or y.
 *
 * The three excluded letters are the ones that never double: `show → showing`,
 * `mix → mixing`, `play → playing`. They are excluded by name because there is
 * no phonetic test available to a string.
 */
function isDoubling(word: string): boolean {
  const last = word.at(-1) ?? '';
  const middle = word.at(-2) ?? '';
  const first = word.at(-3) ?? '';

  return (
    word.length > 2 &&
    !VOWELS.includes(last) &&
    !'wxy'.includes(last) &&
    VOWELS.includes(middle) &&
    !VOWELS.includes(first) &&
    syllables(word) === 1
  );
}

function endsConsonantY(word: string): boolean {
  return word.endsWith('y') && !VOWELS.includes(word.at(-2) ?? '');
}

/**
 * V2 and V3 for a regular verb — the `-ed` forms.
 *
 * Only ever called for a verb the corpus did not give a past for. An irregular
 * verb's past is a fact, not a derivation, and asking this function for `went`
 * would get `goed`.
 */
export function regularPast(base: string): IDerivedForm {
  if (base.endsWith('e')) {
    return { form: `${base}d`, rule: 'drop-e' };
  }

  if (endsConsonantY(base)) {
    return { form: `${base.slice(0, -1)}ied`, rule: 'y-to-i' };
  }

  if (isDoubling(base)) {
    return { form: `${base}${base.at(-1) ?? ''}ed`, rule: 'double' };
  }

  return { form: `${base}ed`, rule: 'add' };
}

/**
 * V4 — the `-ing` form.
 *
 * Every verb has one and it is regular for all but the handful the content
 * overrides, `be → being` included. There is no such thing as an irregular
 * present participle in English beyond the spelling.
 */
export function presentParticiple(base: string): IDerivedForm {
  if (base.endsWith('ie')) {
    return { form: `${base.slice(0, -2)}ying`, rule: 'ie-to-y' };
  }

  // `see → seeing`, `hoe → hoeing`, `dye → dyeing`: the e is doing work, so it
  // stays. Dropping it would collide these with `sing`, `hoing`, `dying`.
  if (base.endsWith('e') && !/(?:ee|oe|ye)$/u.test(base)) {
    return { form: `${base.slice(0, -1)}ing`, rule: 'drop-e' };
  }

  if (isDoubling(base)) {
    return { form: `${base}${base.at(-1) ?? ''}ing`, rule: 'double' };
  }

  return { form: `${base}ing`, rule: 'add' };
}

/** V5 — the he/she/it form. */
export function thirdPerson(base: string): IDerivedForm {
  if (/(?:s|sh|ch|x|z)$/u.test(base)) {
    return { form: `${base}es`, rule: 'add-es' };
  }

  // A consonant before the o takes `-es` — `go → goes`, `echo → echoes` — and a
  // vowel before it does not: `coo → coos`, `shampoo → shampoos`.
  if (base.endsWith('o') && !VOWELS.includes(base.at(-2) ?? '')) {
    return { form: `${base}es`, rule: 'add-es' };
  }

  if (endsConsonantY(base)) {
    return { form: `${base.slice(0, -1)}ies`, rule: 'y-to-i' };
  }

  return { form: `${base}s`, rule: 'add' };
}
