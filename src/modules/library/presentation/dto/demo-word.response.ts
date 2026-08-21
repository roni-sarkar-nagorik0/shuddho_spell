import { z } from 'zod';
import { type IDictationDemoWord } from '../../application/dto/dictation-demo-word';

/**
 * What `GET /api/v1/demo/word` answers with.
 *
 * `null` is a real answer here, not an error: an unseeded database has no word
 * to give, and the page renders its fallback rather than a 500. Making that
 * explicit in the schema is what stops the client treating an empty demo as a
 * broken one.
 */
export const demoWordSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    ipa: z.string(),
    banglaSound: z.string(),
    banglaMeaning: z.string(),
    commonError: z.string().nullable(),
    /**
     * The word in use. Null is ordinary — see `IDictationDemoWord.sentence` —
     * and the panel simply omits the row rather than treating it as an error.
     */
    sentence: z
      .object({
        id: z.string(),
        english: z.string(),
        bangla: z.string(),
      })
      .nullable(),
  })
  .nullable();

const _schemaMatchesContract: z.ZodType<IDictationDemoWord | null> = demoWordSchema;
void _schemaMatchesContract;
