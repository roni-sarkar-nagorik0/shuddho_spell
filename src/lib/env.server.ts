import 'server-only';
import { z } from 'zod';

/**
 * A `.env` file cannot say "absent". Once the key line is written, the variable
 * is present and empty, and `.optional()` no longer applies — so `CRON_SECRET=`
 * fails `min(16)` and takes the whole app down over a job nobody has written
 * yet. `.env.example` ships that exact line, which makes it every fresh
 * checkout's problem rather than an edge case.
 *
 * Only optional variables go through this. A required one arriving empty must
 * still fail, loudly and by name.
 */
function absentIfBlank(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value;
}

/** Server-only variables. Importing this from a Client Component fails the build. */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  CRON_SECRET: z.string().min(16).optional(),
});

export interface IServerEnv {
  readonly NODE_ENV: 'development' | 'test' | 'production';
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly DATABASE_URL: string;
  readonly CRON_SECRET?: string | undefined;
}

const parsed = serverEnvSchema.safeParse({
  NODE_ENV: process.env['NODE_ENV'],
  SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
  DATABASE_URL: process.env['DATABASE_URL'],
  CRON_SECRET: absentIfBlank(process.env['CRON_SECRET']),
});

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Invalid server environment. Check these in .env.local: ${missing}`);
}

export const serverEnv: IServerEnv = parsed.data;
