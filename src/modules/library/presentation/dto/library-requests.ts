import { z } from 'zod';
import { PARTS_OF_SPEECH } from '../../domain/value-objects/part-of-speech';

/**
 * The library's query string. No identity field, for the reason every request
 * schema in this project has none.
 *
 * Everything is a string on the way in, so numbers coerce here — at the edge,
 * once — and are trusted inside.
 */
export const libraryQuerySchema = z.object({
  after: z.string().min(1).max(200).optional(),
  /**
   * Optional rather than `.default(25)`: `withApi`'s `querySchema` is a
   * `ZodType<TQuery>`, whose input and output are the same type, and a default
   * makes them differ. The fallback lives in the handler instead — one place,
   * and still exactly one place.
   */
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  contains: z.string().max(100).optional(),
  weekIndex: z.coerce.number().int().min(1).max(4).optional(),
  partOfSpeech: z.enum(PARTS_OF_SPEECH).optional(),
  ruleFamilyId: z.string().uuid().optional(),
});

export type LibraryQuery = z.infer<typeof libraryQuerySchema>;
