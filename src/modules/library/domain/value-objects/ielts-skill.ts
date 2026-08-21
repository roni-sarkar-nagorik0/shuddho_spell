/**
 * The four IELTS papers.
 *
 * A word family is tagged with the papers it earns marks in, which is not the
 * same as the papers it *appears* in. `fluctuate` is listed for Writing and
 * Reading and not for Speaking, because a candidate who says it aloud in Part 1
 * sounds like they swallowed a report — and a screen that suggested otherwise
 * would be coaching towards a lower band, not a higher one.
 */
export const IELTS_SKILLS = ['speaking', 'writing', 'listening', 'reading'] as const;

export type IeltsSkill = (typeof IELTS_SKILLS)[number];

export function isIeltsSkill(value: string): value is IeltsSkill {
  return (IELTS_SKILLS as readonly string[]).includes(value);
}
