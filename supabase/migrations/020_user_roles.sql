-- 020_user_roles.sql
--
-- Two roles, `user` and `admin`, and the rule that the first person through the
-- door is the admin.
--
-- There is no new table here on purpose. `learner_profiles` is already "one row
-- per signed-in user, created by a trigger" (003) — it *is* the user table, and
-- a second `users` table beside it would be a second answer to "who has signed
-- in", kept in step by hand. What was missing was not a table but two columns:
-- what this person is allowed to do, and an address to recognise them by.
--
-- `email` is a copy, and copies go stale. Two things keep it honest: the signup
-- trigger writes it, and `BootstrapProfileUseCase` — which runs on **every**
-- sign-in and already receives the address from the verified session —
-- overwrites it. So the column is never more than one login out of date, and
-- `GET /api/v1/me` still reads the session's address rather than this one. It
-- exists for the admin list, which is looking at *other* people's rows and has
-- no session of theirs to read.

-- ---------------------------------------------------------------------------
-- The columns
-- ---------------------------------------------------------------------------
alter table public.learner_profiles
  add column if not exists role  text not null default 'user',
  add column if not exists email text;

do $$
begin
  alter table public.learner_profiles
    add constraint learner_profiles_role_check check (role in ('user', 'admin'));
exception
  when duplicate_object then null;
end
$$;

comment on column public.learner_profiles.role is
  'user or admin. Admin sees every learner and the content tables; user sees only their own.';

comment on column public.learner_profiles.email is
  'A copy of auth.users.email, rewritten on every sign-in by BootstrapProfileUseCase. For the admin list, which has no session to read it from.';

-- ---------------------------------------------------------------------------
-- Close the door this opens
-- ---------------------------------------------------------------------------
-- 008 granted `authenticated` a bare `update` on this table: a learner may edit
-- their own row, and until now every column on it was theirs to edit. `role`
-- is not. Left as it stood, any signed-in learner could reach PostgREST with
-- their own session and run
--
--   update learner_profiles set role = 'admin' where user_id = auth.uid()
--
-- which is the whole feature handed away on the day it ships. The policy is not
-- the problem — the row *is* theirs — so the fix is column-level: take the
-- table-wide update back and hand out only the columns onboarding and the
-- settings screens actually write.
--
-- `id`, `user_id`, `started_at`, `created_at`, `role` and `email` are absent
-- from this list, and each absence is deliberate: the first three would let a
-- learner reassign the row, and the last two are the server's to write through
-- the service client.
revoke update on public.learner_profiles from authenticated;

grant update (
  display_name,
  track,
  daily_minutes,
  timezone,
  ui_language,
  current_day_index,
  accent_preference,
  playback_rate,
  onboarding_completed_at
) on public.learner_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- Addresses first, from the only place that has them.
update public.learner_profiles as p
   set email = u.email
  from auth.users as u
 where u.id = p.user_id
   and p.email is distinct from u.email;

-- Then the first admin. "If there is no user, the first one to log in is the
-- admin" — but this database is not empty, so the same rule is applied
-- retroactively: whoever signed up first. Guarded by `not exists`, so a second
-- run of this migration against a database that already has an admin changes
-- nothing.
update public.learner_profiles
   set role = 'admin'
 where id = (
   select id
     from public.learner_profiles
    order by created_at asc, id asc
    limit 1
 )
 and not exists (select 1 from public.learner_profiles where role = 'admin');

-- ---------------------------------------------------------------------------
-- The first user through the door
-- ---------------------------------------------------------------------------
-- "If there is no user yet, the first one to log in is the admin."
--
-- On the row rather than on the signup, and that placement is the point. There
-- are two ways a `learner_profiles` row comes into existence — 009's
-- `on_auth_user_created` trigger, and `BootstrapProfileUseCase` reconciling a
-- profile the trigger did not make — and a rule written into only the first of
-- them is a rule the second quietly breaks. A `before insert` trigger on the
-- table itself is the one place both paths must pass through.
--
-- The advisory lock closes the race. Two signups into an empty database would
-- otherwise both see no admin and both claim it; serialised on one key, the
-- second sees the first's row. Transaction scoped, so it is released whether
-- the signup commits or rolls back, and taken on a constant that collides with
-- nothing else in the system.
--
-- It only ever *grants*. An explicit `role` on the insert is left alone, and so
-- is every row inserted once an admin exists — this cannot demote anyone and
-- cannot fire twice in a database that has an owner.
create or replace function public.assign_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role = 'admin' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('shuddhospell.first_admin'));

  if not exists (select 1 from public.learner_profiles where role = 'admin') then
    new.role := 'admin';
  end if;

  return new;
end;
$$;

comment on function public.assign_first_admin() is
  'Makes the first learner_profiles row an admin, whichever path inserted it. Never demotes and never fires again once an admin exists.';

drop trigger if exists assign_first_admin on public.learner_profiles;
create trigger assign_first_admin
  before insert on public.learner_profiles
  for each row execute function public.assign_first_admin();

-- 009's signup trigger, extended only to carry the address across. The role is
-- not its business any more — the table decides that for every insert.
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

  insert into public.learner_profiles (user_id, display_name, email)
  values (new.id, coalesce(resolved_name, 'Learner'), new.email)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the learner_profiles row for a new auth.users row, carrying the display name and the address. Idempotent: a re-fired trigger does nothing.';

-- ---------------------------------------------------------------------------
-- Reading the roster
-- ---------------------------------------------------------------------------
-- 007's convention: an index comment names the query it serves.
create index if not exists learner_profiles_role_created_at
  on public.learner_profiles (role, created_at desc);

comment on index public.learner_profiles_role_created_at is
  'ListUsers: select id, user_id, display_name, email, role, ... from learner_profiles order by created_at desc — and the admin count SetUserRole makes before it demotes anybody';
