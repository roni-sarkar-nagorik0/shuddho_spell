import 'server-only';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service-client';
import { type IDatabase, type ISelectQuery } from './database';
import { DatabaseError } from './database-error';

/**
 * Supabase types an RPC result `any`. Parsed rather than asserted: `as` is
 * banned outside exactly this position — immediately after a Zod parse at a
 * boundary — and an `any` escaping here would spread through every caller.
 */
const rpcEnvelopeSchema = z.object({
  data: z.unknown(),
  error: z.object({ message: z.string(), code: z.string().optional() }).nullable(),
});

/**
 * The one translation from `IDatabase` to Supabase.
 *
 * It lives in `infrastructure` rather than beside the client in `src/lib`
 * because the boundary rules forbid `lib` importing `infrastructure`, and
 * `IDatabase` is an infrastructure concept. `infrastructure` may import `lib`,
 * which is the direction that is actually true here: this adapter needs the
 * client, the client needs to know nothing about it.
 *
 * Every repository in the application reaches the database through this
 * function's result, and nothing else in `src/modules/` names a Supabase type.
 *
 * The **service client**, deliberately. Repositories run behind use cases that
 * have already resolved identity from the session and filter by `profile_id`
 * explicitly; RLS is the floor beneath that, not the thing being relied on.
 * `03-database.md` is clear that policies are written as if the API did not
 * exist — which is what makes it safe for the API to hold the stronger key.
 */
export function toDatabase(): IDatabase {
  const client = createServiceClient();

  const build = (query: ISelectQuery): ReturnType<typeof buildInner> => buildInner(query);

  function buildInner(query: ISelectQuery) {
    let builder = client.from(query.table).select(query.columns);

    for (const [column, value] of Object.entries(query.eq ?? {})) {
      builder = builder.eq(column, value);
    }

    if (query.whereIn !== undefined) {
      builder = builder.in(query.whereIn.column, [...query.whereIn.values]);
    }

    if (query.lte !== undefined) {
      builder = builder.lte(query.lte.column, query.lte.value);
    }

    if (query.orderBy !== undefined) {
      builder = builder.order(query.orderBy.column, { ascending: query.orderBy.ascending });
    }

    if (query.limit !== undefined) {
      builder = builder.limit(query.limit);
    }

    return builder;
  }

  /**
   * Every failure leaves here as a `DatabaseError` carrying its Postgres code.
   * A repository that had to read the message to tell a unique violation from
   * an outage would be one string change from getting it wrong.
   */
  function raise(what: string, error: { message: string; code?: string | undefined }): never {
    throw new DatabaseError(what, error.code ?? null, error.message);
  }

  return {
    select: async (query) => {
      // An `in ()` with nothing in it matches nothing, and asking Postgres to
      // confirm that is a round trip for a known answer. Every batched read
      // hits this the first time a lesson day has no sentences.
      if (query.whereIn !== undefined && query.whereIn.values.length === 0) {
        return [];
      }

      const { data, error } = await build(query);

      if (error !== null) {
        raise(`could not read ${query.table}`, error);
      }

      return data;
    },

    selectOne: async (query) => {
      const { data, error } = await build(query).maybeSingle();

      if (error !== null) {
        raise(`could not read ${query.table}`, error);
      }

      return data;
    },

    count: async (query) => {
      let builder = client.from(query.table).select('*', { count: 'exact', head: true });

      for (const [column, value] of Object.entries(query.eq ?? {})) {
        builder = builder.eq(column, value);
      }

      if (query.lte !== undefined) {
        builder = builder.lte(query.lte.column, query.lte.value);
      }

      const { count, error } = await builder;

      if (error !== null) {
        raise(`could not count ${query.table}`, error);
      }

      return count ?? 0;
    },

    insert: async (table, values) => {
      const { error } = await client.from(table).insert([...values]);

      if (error !== null) {
        raise(`could not write ${table}`, error);
      }
    },

    upsert: async (table, values, options) => {
      const { error } = await client.from(table).upsert([...values], {
        onConflict: options.onConflict,
        ignoreDuplicates: options.ignoreDuplicates,
      });

      if (error !== null) {
        raise(`could not write ${table}`, error);
      }
    },

    update: async (table, values, match) => {
      let builder = client.from(table).update(values);

      for (const [column, value] of Object.entries(match)) {
        builder = builder.eq(column, value);
      }

      const { error } = await builder;

      if (error !== null) {
        raise(`could not update ${table}`, error);
      }
    },

    delete: async (table, match) => {
      let builder = client.from(table).delete();

      for (const [column, value] of Object.entries(match)) {
        builder = builder.eq(column, value);
      }

      const { error } = await builder;

      if (error !== null) {
        raise(`could not delete from ${table}`, error);
      }
    },

    rpc: async (fn, args) => {
      const { data, error } = rpcEnvelopeSchema.parse(await client.rpc(fn, args));

      if (error !== null) {
        raise(`could not run ${fn}`, error);
      }

      return data;
    },
  };
}
