/**
 * What a `jsonb` column guarantees, and nothing more.
 *
 * A row interface describes the database, so a jsonb column is typed as the
 * database types it: well-formed JSON of unknown shape. Narrowing it to the
 * shape the application expects is the mapper's job, at the one boundary that
 * is allowed to be wrong about the data and say so.
 *
 * This is also what `supabase gen types` emits for a jsonb column, which is
 * what makes the two comparable in `rows.test.ts`.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | readonly Json[]
  | { readonly [key: string]: Json };
