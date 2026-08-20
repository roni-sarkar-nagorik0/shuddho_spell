/**
 * What a wrong answer was wrong *about*.
 *
 * This is the line between a diagnostic product and a quiz. A boolean says the
 * learner failed; `V_W_SUBSTITUTION` says they wrote "wery" for "very", which
 * is the single most predictable Bengali-speaker error in English and the thing
 * the mastery matrix is built to surface. `05-domain-model.md` is explicit:
 * never replace a tag with a boolean.
 *
 * A frozen const plus a derived union rather than an enum. These nine strings
 * are the `attempts_error_tags_known` allowlist in 003 — an enum would create a
 * second set of names to keep in step with the constraint, and a tag that
 * drifts fails an insert at runtime instead of the build.
 */
export const ERROR_TAGS = Object.freeze([
  'DOUBLE_CONSONANT',
  'SILENT_LETTER',
  'ARTICLE_MISSING',
  'V_W_SUBSTITUTION',
  'TENSE_MISMATCH',
  'PREPOSITION_WRONG',
  'WORD_ORDER',
  'Y_TO_I',
  'TION_SION',
] as const);

export type ErrorTag = (typeof ERROR_TAGS)[number];

/**
 * Narrows a string that came from the database. Rows are trusted at the edge,
 * but `error_tags` is a `text[]` and the allowlist is a check constraint — a
 * row written before a tag was renamed would still read back.
 */
export function isErrorTag(value: string): value is ErrorTag {
  return (ERROR_TAGS as readonly string[]).includes(value);
}
