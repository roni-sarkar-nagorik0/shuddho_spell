/**
 * The slice of a Supabase client this repository actually uses.
 *
 * Naming it does two things. It stops infrastructure depending on the whole
 * `SupabaseClient` surface for four calls, and — the reason it exists — it lets
 * a test hand over a fake without a cast. `as never` in a test is a claim that
 * the double matches something it has not been checked against, which is
 * exactly the check worth keeping.
 *
 * The real client satisfies this structurally: every method here is a subset of
 * what the query builder already offers.
 */
export interface IProfileDatabase {
  readonly from: (table: string) => IProfileTable;
}

export interface IProfileTable {
  readonly select: (columns: string) => IProfileFilter;
  /**
   * Field-by-field, not the whole entity. The columns listed are the only ones
   * the application ever changes — `user_id`, `started_at` and the id are the
   * database's, and a repository able to overwrite them is a repository that
   * will one day reassign a profile to a different account.
   */
  readonly update: (values: IProfileUpdate) => IProfileFilter;
  readonly upsert: (
    values: { readonly user_id: string; readonly display_name: string },
    options: { readonly onConflict: string; readonly ignoreDuplicates: boolean },
  ) => PromiseLike<{ readonly error: IDatabaseError | null }>;
}

export interface IProfileUpdate {
  readonly display_name: string;
  readonly track: string;
  readonly daily_minutes: number;
  readonly timezone: string;
  readonly ui_language: string;
  readonly current_day_index: number;
  readonly accent_preference: string;
  readonly playback_rate: number;
  readonly onboarding_completed_at: string | null;
}

export interface IProfileFilter {
  readonly eq: (column: string, value: string) => IProfileRowQuery;
}

export interface IProfileRowQuery {
  readonly maybeSingle: () => PromiseLike<{
    readonly data: unknown;
    readonly error: IDatabaseError | null;
  }>;
  /** An update returns no row unless asked; the repository reads back instead. */
  readonly then?: undefined;
}

export interface IDatabaseError {
  readonly message: string;
  readonly code?: string | undefined;
}
