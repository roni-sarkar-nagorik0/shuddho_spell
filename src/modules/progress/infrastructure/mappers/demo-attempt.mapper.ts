import { z } from 'zod';
import { DemoAttempt } from '../../domain/entities/demo-attempt';

/**
 * The boundary allowed to be wrong about the data, and to say so.
 *
 * A Supabase result is untyped, so the row is parsed rather than trusted, and
 * the columns named are the ones the entity has and no others — selecting the
 * whole row would quietly widen what this depends on.
 */
const rowSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  word_id: z.string(),
  submitted_value: z.string(),
  is_correct: z.boolean(),
  created_at: z.string(),
});

export const DEMO_ATTEMPT_COLUMNS =
  'id, profile_id, word_id, submitted_value, is_correct, created_at';

/**
 * A batch, dropping rows that do not fit — the same call every other mapper
 * here makes. One malformed row costs one line on a dashboard panel; failing
 * the whole read over it costs the panel.
 */
export function toDemoAttempts(rows: readonly unknown[]): readonly DemoAttempt[] {
  return rows.flatMap((row) => {
    const attempt = toDemoAttempt(row);

    return attempt === null ? [] : [attempt];
  });
}

export function toDemoAttempt(row: unknown): DemoAttempt | null {
  const parsed = rowSchema.safeParse(row);

  if (!parsed.success) {
    return null;
  }

  const data = parsed.data;

  return new DemoAttempt({
    id: data.id,
    profileId: data.profile_id,
    wordId: data.word_id,
    submittedValue: data.submitted_value,
    isCorrect: data.is_correct,
    createdAt: new Date(data.created_at),
  });
}
