import { type VocabularyEntry } from '../entities/vocabulary-entry';

export const VOCABULARY_SOURCE = Symbol('VOCABULARY_SOURCE');

/**
 * Where the IELTS vocabulary pairs come from.
 *
 * A port over a compiled module rather than a table, for the reason
 * `IWordFamilySource` gives: this content is written, reviewed and versioned in
 * the repository, it cannot change between deploys, and a `vocabulary` table
 * would add a migration, a seed, a mapper and a round trip to reach an answer
 * the process already holds.
 *
 * `listAll` and not `search`. Filtering 777 entries in memory is microseconds,
 * and pushing predicates through the port so an adapter can implement them over
 * an array fixes the vocabulary of every future filter to whatever the first
 * one happened to need.
 */
export interface IVocabularySource {
  readonly listAll: () => readonly VocabularyEntry[];
}
