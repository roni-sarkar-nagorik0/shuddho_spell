import { type WordFamily } from '../entities/word-family';

export const WORD_FAMILY_SOURCE = Symbol('WORD_FAMILY_SOURCE');

/**
 * Where the word families come from.
 *
 * A port over a compiled module rather than a table, for the reason the grammar
 * lessons are: this content is written, reviewed and versioned in the
 * repository, it never changes between deploys, and a `word_families` table
 * would add a migration, a seed, a mapper and a round trip to reach an answer
 * the process already holds.
 *
 * `listAll` and not `search`. Filtering 412 families in memory is a few
 * microseconds and the alternative — pushing predicates through a port so an
 * adapter can implement them over an array — buys nothing and fixes the
 * vocabulary of every future filter to whatever the first one needed.
 */
export interface IWordFamilySource {
  readonly listAll: () => readonly WordFamily[];
}
