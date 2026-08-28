import { z } from 'zod';
import { VOCABULARY_POS_TAGS, VOCABULARY_TOPICS } from '../../../../../content/ielts-vocabulary/schema';

/**
 * The parts of speech, as the corpus expands them.
 *
 * Derived from the tag map rather than restated, so a fifth tag cannot be added
 * to the content and silently stay unfilterable. `PARTS_OF_SPEECH` in the
 * domain is not the right list here — it carries the nine values the `words`
 * table's check constraint allows, and this corpus holds four of them.
 */
export const VOCABULARY_PARTS_OF_SPEECH = Object.values(VOCABULARY_POS_TAGS);

/**
 * The vocabulary query string.
 *
 * `topic` and `partOfSpeech` are enums over the corpus's own lists rather than
 * free strings, for the reason `wordFamilyQuerySchema` gives: an endpoint that
 * accepts `topic=anything` and answers with an empty page is indistinguishable,
 * from the client, from a topic that exists and is empty.
 */
export const vocabularyQuerySchema = z.object({
  topic: z.enum(VOCABULARY_TOPICS).optional(),
  partOfSpeech: z.enum(['noun', 'verb', 'adjective', 'adverb']).optional(),
  startsWith: z.string().max(40).optional(),
  after: z.string().max(60).optional(),
  /**
   * Optional rather than `.default(24)`: `withApi`'s query schema is a
   * `ZodType<TQuery>`, and a default makes input and output differ. The
   * fallback lives in the handler, as it does for every other list endpoint.
   */
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type VocabularyQuery = z.infer<typeof vocabularyQuerySchema>;

/** How many questions the demo drill may ask for in one request. */
export const vocabularyDrillQuerySchema = z.object({
  count: z.coerce.number().int().min(1).max(20).optional(),
});

export type VocabularyDrillQuery = z.infer<typeof vocabularyDrillQuerySchema>;
