-- 011_onboarding_state.sql — the one thing /auth/callback has to know
-- ---------------------------------------------------------------------------
-- `04-authentication.md` step 3: the callback sends a brand-new profile to
-- `/onboarding` and an existing one to `/dashboard`. 003 gave it nothing to
-- read that can tell those apart.
--
-- "The profile row exists" cannot mean it: the signup trigger in 009 creates
-- that row the instant the `auth.users` row appears, so it is already true for
-- a learner who has never seen a screen. Nor can the profile's own columns say
-- it — `track`, `daily_minutes`, `timezone` and `accent_preference` all carry a
-- default from 003, so a value there does not mean anybody chose it.
--
-- What separates the two is whether the learner has answered the onboarding
-- questions (`13-frontend.md`: goal, minutes a day, track, reminder time, then
-- the diagnostic). That is a fact about the learner, and it was missing.
--
-- Null until onboarding completes. Nothing writes it until the onboarding
-- screen lands in Phase 11, and that is the correct behaviour meanwhile: with
-- no way to answer the questions, every learner really is brand new.
--
-- No grant needed: 008's `grant select, update on public.learner_profiles to
-- authenticated` is table-wide and covers a column added afterwards.

alter table public.learner_profiles
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.learner_profiles.onboarding_completed_at is
  'When the learner finished onboarding. Null means brand new, and /auth/callback sends them to /onboarding.';
