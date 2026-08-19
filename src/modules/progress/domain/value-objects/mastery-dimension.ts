/**
 * The two axes of the mastery matrix — 003's `mastery_records_dimension_check`.
 *
 * A learner is weak at *sounds* or weak at *rules*, and those need different
 * remedies: a phoneme gap is drilled with pronunciation, a rule-family gap with
 * spelling and construction. Collapsing them into one score would tell the
 * learner they are 62% good at English, which is not actionable.
 */
export const MASTERY_DIMENSIONS = Object.freeze(['phoneme', 'rule_family'] as const);

export type MasteryDimension = (typeof MASTERY_DIMENSIONS)[number];
