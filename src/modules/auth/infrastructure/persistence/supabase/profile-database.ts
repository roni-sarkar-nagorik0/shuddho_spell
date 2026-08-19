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
  readonly upsert: (
    values: { readonly user_id: string; readonly display_name: string },
    options: { readonly onConflict: string; readonly ignoreDuplicates: boolean },
  ) => PromiseLike<{ readonly error: IDatabaseError | null }>;
}

export interface IProfileFilter {
  readonly eq: (column: string, value: string) => IProfileRowQuery;
}

export interface IProfileRowQuery {
  readonly maybeSingle: () => PromiseLike<{
    readonly data: unknown;
    readonly error: IDatabaseError | null;
  }>;
}

export interface IDatabaseError {
  readonly message: string;
  readonly code?: string | undefined;
}
