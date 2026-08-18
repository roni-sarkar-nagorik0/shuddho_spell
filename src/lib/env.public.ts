import { z } from 'zod';

/**
 * Variables safe to reach the browser. Inlined by Next at build time, so every
 * key must be written out literally — `process.env[name]` does not get inlined.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export interface IPublicEnv {
  readonly NEXT_PUBLIC_APP_URL: string;
  readonly NEXT_PUBLIC_SUPABASE_URL: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
}

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
  NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
});

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Invalid public environment. Check these in .env.local: ${missing}`);
}

export const publicEnv: IPublicEnv = parsed.data;
