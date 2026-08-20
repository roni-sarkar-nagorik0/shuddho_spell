import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '../env.public';
import { serverEnv } from '../env.server';

/**
 * Bypasses RLS. Never reachable from the browser — `server-only` makes the
 * build fail if a Client Component imports it, directly or transitively.
 */
export function createServiceClient() {
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
