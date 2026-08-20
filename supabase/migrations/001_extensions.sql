-- 001_extensions.sql
--
-- Extensions the rest of the schema depends on. Forward-only and idempotent:
-- re-running this file on an already-migrated database is a no-op.
--
-- Applied by `pnpm db:migrate` against a hosted Supabase project.
-- There is no local database and no Docker.

-- Supabase keeps extensions out of `public` in a schema of their own. It already
-- exists on a hosted project; creating it here is what lets the same file apply
-- to a bare Postgres (the PGlite instance the migration test runs against).
create schema if not exists extensions;

-- gen_random_uuid(), used as the default of every `id` column from 002 onward.
-- Postgres 13+ ships gen_random_uuid() in core, but pgcrypto is also used for
-- digest() in the certificate verification code (006).
create extension if not exists "pgcrypto" with schema extensions;

-- uuid_generate_v4() — not used by our defaults, but Supabase templates and any
-- hand-written SQL a human runs against this database expect it to be present.
create extension if not exists "uuid-ossp" with schema extensions;

-- pg_cron drives exam auto-submit (009) and the notification dispatch window.
-- Those jobs live in the database on purpose: the app is serverless, has no
-- long-running process, and an abandoned exam attempt must still be submitted
-- while the app is completely down.
--
-- pg_cron needs shared_preload_libraries and is not creatable on every Supabase
-- plan or by every role. It is not needed until Phase 7, so a failure here is a
-- notice rather than a hard stop — the migration must not block Phase 2 on a
-- Phase 7 dependency. `pnpm db:migrate` prints the notice.
do $$
begin
  create extension if not exists pg_cron;
exception
  when insufficient_privilege or feature_not_supported or undefined_file then
    raise notice 'pg_cron not enabled (%). Enable it in the Supabase dashboard before Phase 7.', sqlerrm;
end
$$;
