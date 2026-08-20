/**
 * The slice of a database a repository is allowed to use.
 *
 * **Not an ORM and not a query builder.** There is no mapping here, no identity
 * map, no lazy loading and no way to express a join — a query is a plain
 * description of one table read, and every repository turns rows into entities
 * itself. `CLAUDE.md` bans an ORM; this is the opposite of one, a narrowing.
 *
 * It exists for two reasons the Phase 3 repository already ran into. Supabase's
 * fluent builder is generic enough that checking a whole test double against it
 * makes the compiler give up (TS2589), so a double needs `as never` — a claim
 * that the fake matches something nobody checked. And "no file but
 * `src/lib/supabase/` constructs a client" is only enforceable if repositories
 * cannot name the client type at all.
 *
 * Describing a query rather than chaining one also means the adapter is the
 * single place that knows Supabase's API, so swapping it is one file.
 */
export interface ISelectQuery {
  readonly table: string;
  readonly columns: string;
  /** Equality filters, ANDed. */
  readonly eq?: Readonly<Record<string, string | number | boolean | null>>;
  /** `column in (...)`. An empty list means the query is not worth running. */
  readonly whereIn?: { readonly column: string; readonly values: readonly string[] };
  /** `column <= value`, for due dates. */
  readonly lte?: { readonly column: string; readonly value: string };
  /**
   * Strictly greater than. Added by F11.11 for **keyset pagination**: the
   * library's cursor is the last row's `text`, and `gt` is what "everything
   * after it" means. Offset paging would repeat or skip rows whenever content
   * is seeded under a reader.
   */
  readonly gt?: { readonly column: string; readonly value: string };
  /** Case-insensitive pattern match. The caller supplies the `%` wildcards. */
  readonly ilike?: { readonly column: string; readonly pattern: string };
  readonly orderBy?: { readonly column: string; readonly ascending: boolean };
  readonly limit?: number;
}

export interface IUpsertOptions {
  readonly onConflict: string;
  readonly ignoreDuplicates: boolean;
}

export interface IDatabase {
  readonly select: (query: ISelectQuery) => Promise<readonly unknown[]>;

  /** At most one row. Null rather than an error when there is none. */
  readonly selectOne: (query: ISelectQuery) => Promise<unknown>;

  /** `count(*)` without transferring the rows. */
  readonly count: (query: ISelectQuery) => Promise<number>;

  readonly insert: (
    table: string,
    values: readonly Readonly<Record<string, unknown>>[],
  ) => Promise<void>;

  /**
   * `ignoreDuplicates` is not a detail. With it, a conflict leaves the stored
   * row alone; without it, the upsert becomes an update and the loser of a race
   * overwrites what the winner wrote. Both are wanted somewhere, so the caller
   * says which.
   */
  readonly upsert: (
    table: string,
    values: readonly Readonly<Record<string, unknown>>[],
    options: IUpsertOptions,
  ) => Promise<void>;

  readonly update: (
    table: string,
    values: Readonly<Record<string, unknown>>,
    match: Readonly<Record<string, string>>,
  ) => Promise<void>;

  /**
   * Deletes the rows matching an equality filter.
   *
   * Added for push subscriptions, which are the first rows in the product a
   * **delete** is the right answer for. Everywhere else a learner's history is
   * kept — an attempt, a review item, an exam answer is evidence — but a dead
   * push endpoint is not history, it is a browser that no longer exists, and
   * leaving it in the table means failing on every tick forever. 008 grants no
   * client delete on any learner table and this does not change that: it runs
   * through the service client, from the server, on a row the caller has
   * already established belongs to the learner.
   */
  readonly delete: (table: string, match: Readonly<Record<string, string>>) => Promise<void>;

  /** A Postgres function. The only route to a multi-table atomic write. */
  readonly rpc: (fn: string, args: Readonly<Record<string, unknown>>) => Promise<unknown>;
}
