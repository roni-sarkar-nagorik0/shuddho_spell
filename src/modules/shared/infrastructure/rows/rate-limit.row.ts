/**
 * `public.rate_limits` — 012_rate_limits.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IRateLimitRow {
  readonly id: string;
  /** `<rule>:<subject>`, e.g. `submit-attempt:user-uuid`. Unique. */
  readonly bucket: string;
  readonly window_started_at: string;
  readonly request_count: number;
  readonly created_at: string;
  readonly updated_at: string;
}
