import { z } from 'zod';
import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import {
  type IPractiseLogRepository,
  type IPractisedWordPage,
  type PractiseSource,
} from '../../../domain/repositories/practise-log-repository';

/**
 * 022's rows, parsed rather than trusted — the same rule every mapper here
 * follows. `bigint` comes back from PostgREST as a string or a number depending
 * on the driver, so both counts are coerced once, here.
 */
const rowSchema = z.object({
  word_id: z.string(),
  text: z.string(),
  ipa: z.string(),
  bangla_sound: z.string(),
  tries: z.coerce.number(),
  settled: z.boolean(),
  last_at: z.string(),
  total_count: z.coerce.number(),
});

/**
 * Backed by 022's `practised_words`, through the service client.
 *
 * It is the one read in the application that groups, and it groups in the
 * database for the reason the migration states: the alternative is fetching a
 * learner's whole history to count it in memory.
 */
export class SupabasePractiseLogRepository implements IPractiseLogRepository {
  constructor(private readonly db: IDatabase) {}

  async page(
    profileId: string,
    source: PractiseSource,
    limit: number,
    offset: number,
  ): Promise<IPractisedWordPage> {
    const returned = await this.db.rpc('practised_words', {
      p_profile_id: profileId,
      p_source: source,
      p_limit: limit,
      p_offset: offset,
    });

    const rows = (Array.isArray(returned) ? returned : []).flatMap((row: unknown) => {
      const parsed = rowSchema.safeParse(row);

      // Dropped rather than fatal — the same call `toDemoAttempts` and every
      // other mapper here makes. One malformed row costs one line on a list;
      // failing the read over it costs the page.
      return parsed.success ? [parsed.data] : [];
    });

    return {
      words: rows.map((row) => ({
        wordId: row.word_id,
        text: row.text,
        ipa: row.ipa,
        banglaSound: row.bangla_sound,
        tries: row.tries,
        settled: row.settled,
        lastAt: new Date(row.last_at),
      })),
      // The function repeats the total on every row, so any row carries it. An
      // empty page has none — which is a total of zero *for this offset*, and
      // the use case is what knows that a page past the end is not an empty set.
      totalWords: rows[0]?.total_count ?? 0,
    };
  }
}
