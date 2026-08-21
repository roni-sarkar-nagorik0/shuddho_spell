import { z } from 'zod';
import { IELTS_SKILLS } from '../../domain/value-objects/ielts-skill';
import { WORD_FAMILY_TOPICS } from '../../../../../content/word-families/schema';

/**
 * The word-family query string.
 *
 * `topic` is an enum over the corpus's own topic list rather than a free
 * string. The alternative is an endpoint that accepts `topic=anything` and
 * answers with an empty page — indistinguishable, from the client, from a topic
 * that exists and is empty.
 *
 * `startsWith` is capped at 40 characters. No English word is longer than that,
 * and an uncapped filter is a free way to make the server compare a megabyte
 * against 2,299 strings.
 */
export const wordFamilyQuerySchema = z.object({
  skill: z.enum(IELTS_SKILLS).optional(),
  topic: z.enum(WORD_FAMILY_TOPICS).optional(),
  ruleFamily: z.string().regex(/^[a-z0-9_]+$/u).max(60).optional(),
  startsWith: z.string().max(40).optional(),
  after: z.string().max(60).optional(),
  /**
   * Optional rather than `.default(20)`, for the reason `libraryQuerySchema`
   * gives: `withApi`'s query schema is a `ZodType<TQuery>`, and a default makes
   * input and output differ. The fallback lives in the handler.
   */
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
});

export type WordFamilyQuery = z.infer<typeof wordFamilyQuerySchema>;
