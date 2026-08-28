import { z } from 'zod';
import { VERB_RANGES } from '../../../../../content/verb-forms/schema';

/** The three ways the reference is sliced, beside the letter blocks. */
export const VERB_GROUPS = ['irregular', 'regular', 'core'] as const;

/**
 * The verb query string.
 *
 * `letters` is an enum over the corpus's own file ranges rather than a free
 * string, for the reason `wordFamilyQuerySchema` gives: an endpoint that
 * accepts `letters=zz` and answers with an empty page is indistinguishable,
 * from the client, from a block that exists and is empty.
 */
export const verbQuerySchema = z.object({
  letters: z.enum(VERB_RANGES).optional(),
  group: z.enum(VERB_GROUPS).optional(),
  startsWith: z.string().max(40).optional(),
  after: z.string().max(60).optional(),
  /** Optional rather than `.default(50)` — the fallback lives in the handler. */
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type VerbQuery = z.infer<typeof verbQuerySchema>;

export const verbDrillQuerySchema = z.object({
  count: z.coerce.number().int().min(1).max(20).optional(),
  /**
   * `true` restricts the draw to the hundred commonest verbs.
   *
   * Left as the string the query arrived as, not transformed to a boolean.
   * `withApi`'s query schema is a `ZodType<TQuery>` — one type for input and
   * output — and a transform makes the two differ, exactly as a `.default()`
   * does. The handler reads the word.
   */
  core: z.enum(['true', 'false']).optional(),
});

export type VerbDrillQuery = z.infer<typeof verbDrillQuerySchema>;
