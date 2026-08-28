import { type Verb } from '../entities/verb';

export const VERB_SOURCE = Symbol('VERB_SOURCE');

/**
 * Where the verbs come from.
 *
 * A port over a compiled module rather than a table, for the reason
 * `IWordFamilySource` and `IVocabularySource` give: the corpus is written,
 * reviewed and versioned in the repository, it cannot change between deploys,
 * and a `verbs` table would add a migration, a seed, a mapper and a round trip
 * to reach an answer the process already holds.
 *
 * `listAll` and not `search`, for the same reason as its two neighbours:
 * filtering 998 verbs in memory is microseconds, and pushing predicates through
 * the port fixes the vocabulary of every future filter to whatever the first
 * one needed.
 */
export interface IVerbSource {
  readonly listAll: () => readonly Verb[];
}
