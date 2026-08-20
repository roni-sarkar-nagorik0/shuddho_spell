/**
 * The one way this application compares a learner's typing to a target.
 *
 * Case and stray whitespace are not what the product is testing — a learner who
 * types "  Water " has spelled it correctly, and marking that wrong teaches
 * nothing about English. Anything beyond case and whitespace is left alone on
 * purpose: "there" and "their" differ by letters that matter, and a normaliser
 * that reached further would start forgiving the errors the programme exists to
 * catch.
 *
 * Unicode-aware `toLowerCase`, because Bangla prompts sit beside English ones
 * and a locale-naive fold is a bug waiting for the first non-ASCII target.
 */
export function normaliseAnswer(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLowerCase();
}
