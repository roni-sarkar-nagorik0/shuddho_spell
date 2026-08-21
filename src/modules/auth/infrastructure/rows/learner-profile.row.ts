/**
 * `public.learner_profiles` — 003_learner_tables.sql, extended by 011
 *
 * Hand-written from the SQL, never generated. `supabase gen types` verifies it;
 * it is not the source of truth. This interface must not leave `infrastructure/`.
 */
export interface ILearnerProfileRow {
  readonly id: string;
  /** The `auth.users` row this profile hangs off. Unique, cascading. */
  readonly user_id: string;
  readonly display_name: string;
  readonly track: string;
  readonly daily_minutes: number;
  readonly started_at: string;
  /** IANA zone. The learner-local day boundary is derived from it, never stored. */
  readonly timezone: string;
  readonly ui_language: string;
  readonly current_day_index: number;
  readonly accent_preference: string;
  readonly playback_rate: number;
  readonly created_at: string;
  readonly updated_at: string;
  /**
   * Null until the learner finishes onboarding — 011. The signup trigger makes
   * the row, so this, not the row's existence, is what "brand new" means.
   */
  readonly onboarding_completed_at: string | null;
  /** `user` or `admin`, per 020's `learner_profiles_role_check`. */
  readonly role: string;
  /**
   * A copy of `auth.users.email` — 020. Nullable, because the column was added
   * to a table that already had rows and a profile is only refreshed on the
   * owner's next sign-in.
   */
  readonly email: string | null;
}
