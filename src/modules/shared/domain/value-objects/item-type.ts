/**
 * What a learner-facing item *is*. The three content tables a programme day,
 * an attempt or a review item can point at.
 *
 * Shared rather than owned by one module because the pointer crosses every
 * boundary: `program_day_items`, `attempts` and `review_items` each carry an
 * `item_type` beside a bare `item_id`, and a mismatch between two spellings of
 * "sentence" would resolve to the wrong table silently.
 *
 * Note the asymmetry with 003, which allows only `word` and `sentence` on an
 * attempt — you cannot practise a rule family directly, only the words that
 * demonstrate it. `AttemptItemType` is that narrower set.
 */
export const ITEM_TYPES = Object.freeze(['word', 'sentence', 'rule_family'] as const);

export type ItemType = (typeof ITEM_TYPES)[number];

/** The subset an attempt or a review item may carry — 003's own constraint. */
export const ATTEMPT_ITEM_TYPES = Object.freeze(['word', 'sentence'] as const);

export type AttemptItemType = (typeof ATTEMPT_ITEM_TYPES)[number];
