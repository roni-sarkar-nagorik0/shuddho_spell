-- 009_functions_triggers.sql
--
-- The four pieces of behaviour `03-database.md` puts in the database, and
-- nothing beyond them:
--
--   1. `updated_at` maintained by trigger, on every table that has the column
--   2. an `auth.users` insert creating the matching `learner_profiles` row
--   3. session completion as one function, so four tables move in one transaction
--   4. exam auto-submit, driven by pg_cron, because the app is serverless
--
-- On the boundary this file does not cross: the interval ladder, the mastery
-- rule and the streak day-boundary logic are domain services (Phase 4), and
-- `CLAUDE.md` §10 forbids putting business logic a domain service should own
-- into a Postgres function. `complete_lesson_session` therefore computes
-- nothing. It receives rows the domain has already decided on and writes them
-- atomically — the transaction is the point, not the arithmetic.
--
-- Every function here is `security definer` with a pinned `search_path`, and
-- every one has `execute` revoked from the client roles. Postgres grants
-- `execute` to `public` on a newly created function by default, so a function
-- added after 008's revoke sweep would otherwise be callable by any anon
-- visitor. Each revoke below is load-bearing.

-- ---------------------------------------------------------------------------
-- 1. updated_at
-- ---------------------------------------------------------------------------
-- Every table carries `updated_at timestamptz not null default now()`. The
-- default only fires on insert, so without this the column silently lies about
-- every row that has ever been updated.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Stamps updated_at on every update. Attached to every table in public carrying the column.';

-- Attached by loop rather than by hand: the list of tables is already known to
-- the catalogue, and a hand-maintained list is how the table added in Phase 8
-- ends up as the one without a trigger.
do $$
declare
  target text;
begin
  for target in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public'
       and c.column_name = 'updated_at'
       and t.table_type = 'BASE TABLE'
  loop
    execute format('drop trigger if exists %I on public.%I', 'set_updated_at_' || target, target);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      'set_updated_at_' || target, target
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. A new auth.users row gets a learner_profiles row
-- ---------------------------------------------------------------------------
-- `03-database.md`: the API's `BootstrapProfileUseCase` is idempotent on top of
-- this, not a substitute for it. A learner who signs up and closes the tab
-- before the app ever runs still has a profile.
--
-- `security definer` because the row is inserted by Supabase's auth service,
-- which has no rights on `public.learner_profiles`, and because 008 gives the
-- client no insert policy on that table at all.
--
-- Google is the only provider, so a display name is always available from the
-- OAuth profile. The coalesce chain is a belt: `display_name` is `not null`
-- with a non-blank check, and a signup failing on it would fail the signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  resolved_name text;
begin
  resolved_name := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  )), '');

  insert into public.learner_profiles (user_id, display_name)
  values (new.id, coalesce(resolved_name, 'Learner'))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the learner_profiles row for a new auth.users row. Idempotent: a re-fired trigger does nothing.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Session completion, in one transaction
-- ---------------------------------------------------------------------------
-- Four tables move together or not at all: the attempts that were made, the
-- review queue they change, the mastery rollup they feed, and the streak they
-- extend. A partial write here is a learner whose streak advanced but whose
-- review items did not — the kind of corruption nobody notices until the
-- spaced repetition stops making sense.
--
-- Every value arrives already computed. `ReviewItem.recordResult` decided the
-- new `interval_index` and `due_at`; `MasteryCalculator` decided the accuracy;
-- `StreakRecord.registerActivity` decided the streak in the learner's own
-- timezone. This function is the `IUnitOfWork` boundary and nothing else, which
-- is why it takes jsonb rather than a pile of scalars: the shapes belong to the
-- domain, and encoding them as SQL parameters would drag those rules in here.
--
-- Returns the number of attempts written, so the caller can assert the payload
-- it sent is the payload that landed.
create or replace function public.complete_lesson_session(
  p_session_id     uuid,
  p_items_total    integer,
  p_items_correct  integer,
  p_attempts       jsonb default '[]'::jsonb,
  p_review_items   jsonb default '[]'::jsonb,
  p_mastery        jsonb default '[]'::jsonb,
  p_streak         jsonb default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id     uuid;
  v_attempt_count  integer := 0;
begin
  -- The session is the anchor: every row written below is forced to carry its
  -- profile_id, so a payload naming someone else's profile cannot land.
  select profile_id into v_profile_id
    from public.lesson_sessions
   where id = p_session_id
   for update;

  if v_profile_id is null then
    raise exception 'lesson session % does not exist', p_session_id
      using errcode = 'no_data_found';
  end if;

  insert into public.attempts
    (session_id, profile_id, item_type, item_id, mode, submitted_value,
     is_correct, score, error_tags, latency_ms)
  select
    p_session_id,
    v_profile_id,
    row_in ->> 'item_type',
    (row_in ->> 'item_id')::uuid,
    row_in ->> 'mode',
    row_in ->> 'submitted_value',
    (row_in ->> 'is_correct')::boolean,
    (row_in ->> 'score')::numeric,
    coalesce(
      (select array_agg(tag) from jsonb_array_elements_text(row_in -> 'error_tags') as tag),
      '{}'
    ),
    nullif(row_in ->> 'latency_ms', '')::integer
  from jsonb_array_elements(p_attempts) as row_in;

  get diagnostics v_attempt_count = row_count;

  -- The review queue. Unique on (profile_id, item_type, item_id), so a second
  -- pass over the same word updates the ladder rather than forking it.
  insert into public.review_items
    (profile_id, item_id, item_type, interval_index, due_at, times_seen,
     times_correct, consecutive_correct, last_correct_on, is_mastered, last_error_tags)
  select
    v_profile_id,
    (row_in ->> 'item_id')::uuid,
    row_in ->> 'item_type',
    (row_in ->> 'interval_index')::integer,
    (row_in ->> 'due_at')::timestamptz,
    (row_in ->> 'times_seen')::integer,
    (row_in ->> 'times_correct')::integer,
    (row_in ->> 'consecutive_correct')::integer,
    nullif(row_in ->> 'last_correct_on', '')::date,
    (row_in ->> 'is_mastered')::boolean,
    coalesce(
      (select array_agg(tag) from jsonb_array_elements_text(row_in -> 'last_error_tags') as tag),
      '{}'
    )
  from jsonb_array_elements(p_review_items) as row_in
  on conflict (profile_id, item_type, item_id) do update set
    interval_index      = excluded.interval_index,
    due_at              = excluded.due_at,
    times_seen          = excluded.times_seen,
    times_correct       = excluded.times_correct,
    consecutive_correct = excluded.consecutive_correct,
    last_correct_on     = excluded.last_correct_on,
    is_mastered         = excluded.is_mastered,
    last_error_tags     = excluded.last_error_tags;

  insert into public.mastery_records
    (profile_id, dimension, dimension_id, attempts, correct, accuracy, last_updated_at)
  select
    v_profile_id,
    row_in ->> 'dimension',
    (row_in ->> 'dimension_id')::uuid,
    (row_in ->> 'attempts')::integer,
    (row_in ->> 'correct')::integer,
    (row_in ->> 'accuracy')::numeric,
    now()
  from jsonb_array_elements(p_mastery) as row_in
  on conflict (profile_id, dimension, dimension_id) do update set
    attempts        = excluded.attempts,
    correct         = excluded.correct,
    accuracy        = excluded.accuracy,
    last_updated_at = excluded.last_updated_at;

  -- One streak row per learner, so this is an upsert of a single record. The
  -- dates were resolved in the learner's timezone before they got here.
  if p_streak is not null then
    insert into public.streak_records
      (profile_id, current_streak, longest_streak, last_active_date, freezes_remaining)
    values (
      v_profile_id,
      (p_streak ->> 'current_streak')::integer,
      (p_streak ->> 'longest_streak')::integer,
      nullif(p_streak ->> 'last_active_date', '')::date,
      coalesce((p_streak ->> 'freezes_remaining')::integer, 0)
    )
    on conflict (profile_id) do update set
      current_streak    = excluded.current_streak,
      longest_streak    = excluded.longest_streak,
      last_active_date  = excluded.last_active_date,
      freezes_remaining = excluded.freezes_remaining;
  end if;

  update public.lesson_sessions
     set completed_at  = coalesce(completed_at, now()),
         items_total   = p_items_total,
         items_correct = p_items_correct
   where id = p_session_id;

  return v_attempt_count;
end;
$$;

comment on function public.complete_lesson_session(uuid, integer, integer, jsonb, jsonb, jsonb, jsonb) is
  'The IUnitOfWork boundary for finishing a lesson: attempts, review items, mastery and streak in one transaction. Computes nothing — the domain decided every value.';

-- ---------------------------------------------------------------------------
-- 4. Exam auto-submit
-- ---------------------------------------------------------------------------
-- `08-exam-engine.md`: an abandoned attempt must not block a retake, and the
-- app is serverless with no long-running process, so this has to work when the
-- app is completely down. `/api/cron/exam-autosubmit` is a backstop, not the
-- primary path.
--
-- Status becomes `submitted`, not `failed`: the deadline passing is not a
-- grade. The exam engine scores it and moves it to passed or failed, which is
-- why the `exam_attempts_finished_has_outcome` constraint only demands an
-- outcome for those two.
create or replace function public.autosubmit_expired_exam_attempts()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  update public.exam_attempts
     set status       = 'submitted',
         submitted_at = now()
   where status = 'in_progress'
     and server_deadline_at is not null
     and server_deadline_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.autosubmit_expired_exam_attempts() is
  'Submits attempts abandoned past server_deadline_at so a stale attempt never blocks a retake. Marks submitted, never graded — scoring belongs to the exam engine.';

-- pg_cron is optional at this point in the build: 001 downgrades a failed
-- `create extension` to a notice because it needs shared_preload_libraries and
-- is not creatable on every Supabase plan. The job is not needed until Phase 7,
-- so a database without the extension gets a notice here too rather than a
-- failed migration.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('exam-autosubmit')
      where exists (select 1 from cron.job where jobname = 'exam-autosubmit');

    perform cron.schedule(
      'exam-autosubmit',
      '* * * * *',
      'select public.autosubmit_expired_exam_attempts()'
    );
  else
    raise notice 'pg_cron absent — exam auto-submit not scheduled. Enable it before Phase 7; /api/cron/exam-autosubmit is only a backstop.';
  end if;
exception
  when insufficient_privilege or undefined_table or undefined_function then
    raise notice 'pg_cron present but not usable by this role (%). Schedule exam-autosubmit from the dashboard before Phase 7.', sqlerrm;
end
$$;

-- ---------------------------------------------------------------------------
-- Nothing here is the client's to call
-- ---------------------------------------------------------------------------
-- Postgres grants `execute` to `public` on a new function, so 008's revoke
-- sweep does not cover anything created afterwards. Without these lines an anon
-- visitor could call `complete_lesson_session` directly and write a finished
-- lesson, a mastery rollup and a streak for any session id they could guess.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.autosubmit_expired_exam_attempts() from public, anon, authenticated;
revoke all on function public.complete_lesson_session(uuid, integer, integer, jsonb, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
