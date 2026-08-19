import { type z } from 'zod';

/**
 * Parses a batch of rows, dropping the ones that do not fit.
 *
 * Dropping rather than throwing, and the choice is deliberate per read: a
 * malformed row in a **list** is one word missing from a lesson, and failing
 * the whole request over it turns a content error into an outage. A malformed
 * row in a **single** read is different — the caller asked for that one thing —
 * so `parseRow` returns null and lets the caller decide.
 *
 * Either way the row never reaches the domain half-formed. This is the boundary
 * `02-typescript-rules.md` puts Zod at, and the only place `as` would otherwise
 * be tempting.
 */
export function parseRows<T>(schema: z.ZodType<T>, rows: readonly unknown[]): readonly T[] {
  return rows.flatMap((row) => {
    const parsed = schema.safeParse(row);

    return parsed.success ? [parsed.data] : [];
  });
}

export function parseRow<T>(schema: z.ZodType<T>, row: unknown): T | null {
  const parsed = schema.safeParse(row);

  return parsed.success ? parsed.data : null;
}
