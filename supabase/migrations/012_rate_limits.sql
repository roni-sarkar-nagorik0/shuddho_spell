-- 012_rate_limits.sql — the table Phase 2 never shipped, and F1.9 waited for
-- ---------------------------------------------------------------------------
-- `11-api-surface.md`: rate limits on every write route, through `IRateLimiter`,
-- "Postgres-backed so it needs no extra infrastructure; Upstash Redis swaps in
-- behind the same port". This is that Postgres.
--
-- A fixed window, not a sliding one. A sliding window needs either a row per
-- request or a sorted set, and neither is worth it here: the threat is a script
-- hammering an endpoint, and a fixed window stops that. The known weakness is
-- that a caller can spend a full allowance at the end of one window and another
-- at the start of the next; for a learning app's write routes, twice the limit
-- for one second is not an incident.
--
-- The counter is incremented **inside the database**, in one statement. The
-- read-then-write an application-side limiter would do has a gap between the
-- two, and a rate limiter with a race is a rate limiter an attacker wins by
-- opening more connections.

-- Follows 03-database.md's table conventions like every other table: a uuid
-- `id`, `created_at`, `updated_at`. `bucket` is the natural key and carries the
-- unique index the upsert conflicts on — a text primary key would have been
-- fine in isolation and inconsistent with the other twenty-one tables, which is
-- a worse trade than one extra column.
create table if not exists public.rate_limits (
  id                 uuid        primary key default gen_random_uuid(),
  -- `<rule>:<subject>` — the rule that applies and who it applies to. One row
  -- per bucket, reused across windows rather than accumulating history.
  bucket             text        not null unique,
  window_started_at  timestamptz not null default now(),
  request_count      integer     not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint rate_limits_count_non_negative check (request_count >= 0)
);

comment on table public.rate_limits is
  'Fixed-window request counters, one row per rule-and-subject. Written only by consume_rate_limit.';

comment on column public.rate_limits.bucket is
  'rule:subject — e.g. submit-attempt:profile-uuid. Two learners never share a bucket.';

-- No learner data here, and no reason for a learner to read it. RLS on with no
-- policy means exactly that: the service role reaches it, nobody else does.
alter table public.rate_limits enable row level security;

revoke all on public.rate_limits from anon, authenticated;

-- ---------------------------------------------------------------------------
-- consume_rate_limit — count one request and say whether it is allowed
-- ---------------------------------------------------------------------------
-- Atomic by construction. The `insert … on conflict do update` is a single
-- statement, so two concurrent requests for the same bucket serialise on the
-- row lock rather than both reading 59 and both deciding they are the 60th.
--
-- The window resets inside the same statement: when the stored window is older
-- than `window_seconds`, the update starts a new one at `now()` with a count of
-- 1 instead of adding to a stale total.

create or replace function public.consume_rate_limit(
  bucket_key      text,
  max_requests    integer,
  window_seconds  integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count  integer;
  window_start   timestamptz;
begin
  if max_requests < 1 or window_seconds < 1 then
    raise exception 'consume_rate_limit needs a positive limit and window';
  end if;

  insert into public.rate_limits as rl (bucket, window_started_at, request_count, updated_at)
  values (bucket_key, now(), 1, now())
  on conflict (bucket) do update
    set
      window_started_at =
        case
          when rl.window_started_at < now() - make_interval(secs => window_seconds)
            then now()
          else rl.window_started_at
        end,
      request_count =
        case
          when rl.window_started_at < now() - make_interval(secs => window_seconds)
            then 1
          else rl.request_count + 1
        end,
      updated_at = now()
  returning rl.request_count, rl.window_started_at
  into current_count, window_start;

  return query
  select
    current_count <= max_requests,
    greatest(max_requests - current_count, 0),
    greatest(
      ceil(
        extract(epoch from (window_start + make_interval(secs => window_seconds) - now()))
      )::integer,
      0
    );
end;
$$;

comment on function public.consume_rate_limit(text, integer, integer) is
  'Counts one request in a fixed window and reports whether it is allowed. Atomic: the count is incremented in the same statement that reads it.';

-- Postgres grants execute to `public` on a new function, so 008's revoke sweep
-- does not cover this one. Only the service role may call it — a client that
-- could call it directly could also spend its own allowance to zero, or
-- somebody else's.
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
