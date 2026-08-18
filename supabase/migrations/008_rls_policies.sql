-- 008_rls_policies.sql
--
-- Row level security, written as if the API did not exist (`03-database.md`).
-- The API holding a service-role key is not a reason for a weak policy: the
-- anon key ships to every browser, so these policies are the only thing between
-- one learner's rows and everybody else's.
--
-- Three shapes, and nothing else:
--
--   learner tables   a learner reads and writes only rows whose `profile_id`
--                    resolves to `auth.uid()`. No client delete, anywhere.
--   content tables   any authenticated user may read; nobody may write.
--   exam_questions   no client policy at all. It holds `correct_answer`, so the
--                    client-visible subset is a view, and that is F2.7's job.
--
-- RLS was switched on for every table in 002–006. This file only writes the
-- policies and the grants; a table with RLS on and no policy denies everything,
-- which is the correct default for anything not named below.

-- ---------------------------------------------------------------------------
-- Who am I
-- ---------------------------------------------------------------------------
-- Every learner policy needs the caller's `learner_profiles.id`, not their
-- `auth.users.id`. Doing that as a subquery in each policy would re-plan the
-- lookup on every row; doing it here makes each policy a single equality.
--
-- `security definer` is what stops the recursion: this function reads
-- `learner_profiles`, which is itself under RLS, and a policy that had to
-- consult a policy to evaluate would not terminate. Owned by the migration
-- role, it reads the table directly.
--
-- `search_path` is pinned because a `security definer` function that resolves
-- its own table name through a caller-controlled search path is a privilege
-- escalation waiting to happen.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.learner_profiles where user_id = auth.uid()
$$;

comment on function public.current_profile_id() is
  'The caller''s learner_profiles.id, or null when unauthenticated. security definer so a policy on learner_profiles does not recurse.';

-- ---------------------------------------------------------------------------
-- Baseline: take everything away, then hand back exactly what is needed
-- ---------------------------------------------------------------------------
-- Supabase grants the client roles broad table privileges by default. Starting
-- from revoke means a table added later is unreachable until someone grants it
-- on purpose, rather than being readable because nobody remembered.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant execute on function public.current_profile_id() to authenticated;

-- ---------------------------------------------------------------------------
-- learner_profiles — the root of the learner graph
-- ---------------------------------------------------------------------------
-- Owned by an `auth.users` row rather than by a profile, so this is the one
-- table matching on `auth.uid()` directly.
--
-- No insert policy: the profile is created by the `auth.users` trigger in 009,
-- never by the client. No delete policy: a profile goes when the user goes,
-- by cascade.
grant select, update on public.learner_profiles to authenticated;

drop policy if exists learner_profiles_select_own on public.learner_profiles;
create policy learner_profiles_select_own
  on public.learner_profiles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists learner_profiles_update_own on public.learner_profiles;
create policy learner_profiles_update_own
  on public.learner_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Learner tables — one policy shape, applied to every table carrying profile_id
-- ---------------------------------------------------------------------------
-- Written as a loop over the table list rather than eleven copy-pasted blocks:
-- the point of denormalising `profile_id` onto every child in 003 was that the
-- policy is identical everywhere, and a hand-copied policy is where the one
-- table that says `!=` instead of `=` hides.
--
-- `using` governs which existing rows are visible to select and update;
-- `with check` governs what a row is allowed to look like after insert or
-- update. Both are required: `using` alone would let a learner update their own
-- row to carry someone else's `profile_id`.
--
-- Delete is granted to nobody. Learner history is not the client's to erase.
do $$
declare
  target text;
begin
  foreach target in array array[
    'attempts',
    'certificates',
    'exam_answers',
    'exam_attempts',
    'lesson_sessions',
    'mastery_records',
    'notification_preferences',
    'notifications',
    'push_subscriptions',
    'review_items',
    'streak_records'
  ]
  loop
    execute format('grant select, insert, update on public.%I to authenticated', target);

    execute format('drop policy if exists %I on public.%I', target || '_select_own', target);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (profile_id = public.current_profile_id())',
      target || '_select_own', target
    );

    execute format('drop policy if exists %I on public.%I', target || '_insert_own', target);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (profile_id = public.current_profile_id())',
      target || '_insert_own', target
    );

    execute format('drop policy if exists %I on public.%I', target || '_update_own', target);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (profile_id = public.current_profile_id())
         with check (profile_id = public.current_profile_id())',
      target || '_update_own', target
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Content tables — readable by any authenticated user, writable by none
-- ---------------------------------------------------------------------------
-- The course itself. `exam_definitions` and `exam_sections` are here rather
-- than with the learner tables because they describe the exam, not anyone's
-- attempt at it: every learner sees the same rows.
--
-- Select only. Content is written by the seeding pipeline through the service
-- role, which bypasses RLS, so no client write policy needs to exist.
do $$
declare
  target text;
begin
  foreach target in array array[
    'exam_definitions',
    'exam_sections',
    'phonemes',
    'program_day_items',
    'program_days',
    'rule_families',
    'sentence_items',
    'word_phonemes',
    'words'
  ]
  loop
    execute format('grant select on public.%I to authenticated', target);
    execute format('drop policy if exists %I on public.%I', target || '_select_authenticated', target);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      target || '_select_authenticated', target
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- exam_questions — deliberately no policy
-- ---------------------------------------------------------------------------
-- RLS is on and nothing below grants the client a way in, so every client read
-- returns nothing. That is intentional: the row carries `correct_answer`, and a
-- select policy here would hand a learner the answer key to the exam they are
-- sitting. The safe, column-limited view is F2.7. Until it exists, the API
-- reads this table through the service role and nobody else reads it at all.
comment on table public.exam_questions is
  'No client RLS policy by design: correct_answer lives here. The client-visible subset is the view added in F2.7; the API reads this table via the service role.';

-- ---------------------------------------------------------------------------
-- Public certificate verification
-- ---------------------------------------------------------------------------
-- The one public business route in the product (`11-api-surface.md`): a
-- certificate an employer needs an account to check is worth nothing. 006 split
-- the columns for exactly this moment.
--
-- A view rather than an anon policy on `certificates`, because the table also
-- holds `profile_id` and the day-1/day-28 `comparison`. Those stay private; a
-- view that never selects them cannot leak them, whereas a row-level policy
-- would expose every column of any row it matched.
--
-- The view is not `security_invoker`, so it reads `certificates` as its owner
-- and the anon caller needs no privilege on the underlying table.
--
-- `revoked_at` is exposed on purpose. A revoked certificate must still verify —
-- as revoked. Hiding it would make a revoked certificate indistinguishable from
-- a valid one.
create or replace view public.certificate_verifications as
  select
    verification_code,
    learner_name,
    track,
    score_percent,
    issued_at,
    revoked_at,
    revoked_reason
  from public.certificates;

comment on view public.certificate_verifications is
  'Public face of a certificate, looked up by verification_code. Excludes profile_id and comparison. A revoked certificate verifies as revoked.';

grant select on public.certificate_verifications to anon, authenticated;
