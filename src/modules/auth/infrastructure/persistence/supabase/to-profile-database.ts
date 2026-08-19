import { type SupabaseClient } from '@supabase/supabase-js';
import { type IProfileDatabase } from './profile-database';

/**
 * Narrows a Supabase client to the four calls the profile repository makes.
 *
 * Written out call by call rather than handed over whole: the query builder's
 * types are generic enough that comparing the entire surface against the
 * interface makes the compiler give up (TS2589). Each hop here is checked on
 * its own, which is both cheap and more honest about what is being used.
 */
export function toProfileDatabase(client: SupabaseClient): IProfileDatabase {
  return {
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) => ({
          maybeSingle: () => client.from(table).select(columns).eq(column, value).maybeSingle(),
        }),
      }),
      update: (values) => ({
        eq: (column, value) => ({
          maybeSingle: () => client.from(table).update(values).eq(column, value).maybeSingle(),
        }),
      }),
      upsert: (values, options) => client.from(table).upsert(values, options),
    }),
  };
}
