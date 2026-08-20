import { z } from 'zod';

/**
 * Variables safe to reach the browser. Inlined by Next at build time, so every
 * key must be written out literally — `process.env[name]` does not get inlined.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  /**
   * The VAPID public key. Genuinely public — the browser hands it to the push
   * service when it subscribes, so it is in the client bundle on purpose. Its
   * private counterpart lives in `env.server.ts` and never leaves the server.
   *
   * Optional, because the app runs with push switched off and the permission
   * banner simply does not appear.
   */
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
});

export interface IPublicEnv {
  readonly NEXT_PUBLIC_APP_URL: string;
  readonly NEXT_PUBLIC_SUPABASE_URL: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  readonly NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string | undefined;
}

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
  NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  // Written out literally, like the rest: Next inlines `process.env.NAME` at
  // build time and does not inline a computed lookup.
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'],
});

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Invalid public environment. Check these in .env.local: ${missing}`);
}

export const publicEnv: IPublicEnv = parsed.data;
