-- 003_learner_tables.sql
--
-- Per-learner state: the profile, the daily sessions, every attempt, the spaced
-- repetition queue, per-dimension mastery and the streak.
--
-- Everything here is private to one learner. Two rules make that true:
--
--   1. Every table below carries `profile_id ... references learner_profiles(id)
--      on delete cascade`, including tables that could reach the profile through
--      a join. The column is denormalised on purpose: an RLS policy that has to
--      join to find the owner is a policy that is easy to get wrong, and RLS is
--      written here as if the API did not exist.
--   2. RLS is enabled on every table now; the policies land in 008_rls_policies.
--      Until then RLS with no policy denies every client read and write.
--
-- learner_profiles itself is the root and carries `user_id` instead — its owner
-- is an auth.users row, not another profile.

-- ---------------------------------------------------------------------------
-- learner_profiles — one row per signed-in user, created by a trigger in 009
-- ---------------------------------------------------------------------------
create table if not exists public.learner_profiles (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null unique references auth.users (id) on delete cascade,
  display_name        text        not null,
  track               text        not null default 'standard28',
  daily_minutes       integer     not null default 30,
  started_at          timestamptz not null default now(),
  -- IANA zone name. Every learner-facing day boundary — streaks, due dates, the
  -- "3 different calendar days" mastery rule — is computed in this zone, never
  -- in the server's. Storing naive local time instead would lose the rule.
  timezone            text        not null default 'Asia/Dhaka',
  ui_language         text        not null default 'bn',
  current_day_index   integer     not null default 1,
  accent_preference   text        not null default 'british',
  -- 0.50 to 1.50 of normal speed. numeric, not float: it is displayed back to
  -- the learner and compared for equality.
  playback_rate       numeric(3, 2) not null default 1.00,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint learner_profiles_track_check
    check (track in ('standard28', 'sprint21')),
  constraint learner_profiles_ui_language_check
    check (ui_language in ('en', 'bn')),
  constraint learner_profiles_accent_check
    check (accent_preference in ('british', 'american')),
  constraint learner_profiles_daily_minutes_range
    check (daily_minutes between 5 and 180),
  constraint learner_profiles_current_day_range
    check (current_day_index between 1 and 28),
  constraint learner_profiles_playback_rate_range
    check (playback_rate between 0.50 and 1.50),
  constraint learner_profiles_timezone_not_blank
    check (length(btrim(timezone)) > 0),
  constraint learner_profiles_display_name_not_blank
    check (length(btrim(display_name)) > 0)
);

comment on table public.learner_profiles is
  'One row per auth.users row. Created by the on-signup trigger in 009, not by the API.';

comment on column public.learner_profiles.timezone is
  'IANA zone. The learner day boundary for streaks, due dates and the mastery rule.';

-- ---------------------------------------------------------------------------
-- lesson_sessions — one run through one programme day
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_sessions (
  id             uuid        primary key default gen_random_uuid(),
  profile_id     uuid        not null references public.learner_profiles (id) on delete cascade,
  day_index      integer     not null,
  -- The five stages run in order: review → learn → dictate → speak → build.
  -- The order itself is a domain rule (LessonSession.advanceStage), not a check
  -- constraint: SQL can say which stages exist, not which transitions are legal.
  stage          text        not null default 'review',
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  items_total    integer     not null default 0,
  items_correct  integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint lesson_sessions_stage_check
    check (stage in ('review', 'learn', 'dictate', 'speak', 'build')),
  constraint lesson_sessions_day_index_range
    check (day_index between 1 and 28),
  constraint lesson_sessions_items_non_negative
    check (items_total >= 0 and items_correct >= 0),
  constraint lesson_sessions_correct_within_total
    check (items_correct <= items_total),
  constraint lesson_sessions_completed_after_started
    check (completed_at is null or completed_at >= started_at)
);

comment on table public.lesson_sessions is
  'One session per attempt at a day. A day may be repeated, so there is no unique (profile_id, day_index).';

-- ---------------------------------------------------------------------------
-- attempts — every answer a learner submits, right or wrong
-- ---------------------------------------------------------------------------
create table if not exists public.attempts (
  id               uuid        primary key default gen_random_uuid(),
  session_id       uuid        not null references public.lesson_sessions (id) on delete cascade,
  -- Denormalised from the session so an RLS policy never has to join.
  profile_id       uuid        not null references public.learner_profiles (id) on delete cascade,
  item_type        text        not null,
  item_id          uuid        not null,
  mode             text        not null,
  submitted_value  text        not null,
  is_correct       boolean     not null,
  -- numeric, never float. A 79.999 that should be an 80 is a real bug.
  score            numeric(5, 2) not null,
  -- Named diagnostic tags, not a boolean. This is what makes a wrong answer
  -- teach something. Adding a tag is a new migration, by design.
  error_tags       text[]      not null default '{}',
  latency_ms       integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint attempts_item_type_check
    check (item_type in ('word', 'sentence')),
  constraint attempts_mode_check
    check (mode in ('dictation', 'pronunciation', 'construction')),
  constraint attempts_score_range
    check (score between 0 and 100),
  constraint attempts_latency_non_negative
    check (latency_ms is null or latency_ms >= 0),
  constraint attempts_error_tags_known
    check (error_tags <@ array[
      'DOUBLE_CONSONANT', 'SILENT_LETTER', 'ARTICLE_MISSING', 'V_W_SUBSTITUTION',
      'TENSE_MISMATCH', 'PREPOSITION_WRONG', 'WORD_ORDER', 'Y_TO_I', 'TION_SION'
    ]::text[])
);

comment on table public.attempts is
  'Immutable record of one submitted answer. Never updated by the client; no client delete at all.';

comment on column public.attempts.error_tags is
  'Named ErrorTag values. Constrained so a typo in a tag fails the insert rather than silently creating a new category.';

-- ---------------------------------------------------------------------------
-- review_items — the spaced repetition queue
-- ---------------------------------------------------------------------------
create table if not exists public.review_items (
  id                   uuid        primary key default gen_random_uuid(),
  profile_id           uuid        not null references public.learner_profiles (id) on delete cascade,
  item_id              uuid        not null,
  item_type            text        not null,
  -- Rung on the fixed ladder 1, 3, 7, 16, 35 (06-spaced-repetition.md). The
  -- intervals themselves live in ReviewSchedulingPolicy and nowhere else — this
  -- column stores the rung, never the number of days.
  interval_index       integer     not null default 0,
  due_at               timestamptz not null,
  times_seen           integer     not null default 0,
  times_correct        integer     not null default 0,
  consecutive_correct  integer     not null default 0,
  -- Mastery is 3 consecutive correct answers on 3 *different* calendar days, so
  -- the last crediting day has to be remembered: a second correct answer on the
  -- same learner-local day must not count twice.
  last_correct_on      date,
  is_mastered          boolean     not null default false,
  last_error_tags      text[]      not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint review_items_item_type_check
    check (item_type in ('word', 'sentence')),
  constraint review_items_interval_index_range
    check (interval_index between 0 and 4),
  constraint review_items_counts_non_negative
    check (times_seen >= 0 and times_correct >= 0 and consecutive_correct >= 0),
  constraint review_items_correct_within_seen
    check (times_correct <= times_seen),
  -- One queue entry per item per learner. Two rows for the same word would
  -- surface it twice in one session and double-count it toward mastery.
  constraint review_items_profile_item_unique
    unique (profile_id, item_type, item_id)
);

comment on table public.review_items is
  'One row per learner per item. interval_index is a rung, not a day count.';

-- ---------------------------------------------------------------------------
-- mastery_records — rolled-up accuracy per phoneme and per rule family
-- ---------------------------------------------------------------------------
create table if not exists public.mastery_records (
  id               uuid        primary key default gen_random_uuid(),
  profile_id       uuid        not null references public.learner_profiles (id) on delete cascade,
  dimension        text        not null,
  dimension_id     uuid        not null,
  attempts         integer     not null default 0,
  correct          integer     not null default 0,
  accuracy         numeric(5, 2) not null default 0,
  last_updated_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint mastery_records_dimension_check
    check (dimension in ('phoneme', 'rule_family')),
  constraint mastery_records_counts_non_negative
    check (attempts >= 0 and correct >= 0),
  constraint mastery_records_correct_within_attempts
    check (correct <= attempts),
  constraint mastery_records_accuracy_range
    check (accuracy between 0 and 100),
  constraint mastery_records_profile_dimension_unique
    unique (profile_id, dimension, dimension_id)
);

comment on table public.mastery_records is
  'Per-learner accuracy on one phoneme or one rule family. dimension_id is polymorphic, so no FK.';

-- ---------------------------------------------------------------------------
-- streak_records — one per learner
-- ---------------------------------------------------------------------------
create table if not exists public.streak_records (
  id                 uuid        primary key default gen_random_uuid(),
  profile_id         uuid        not null unique references public.learner_profiles (id) on delete cascade,
  current_streak     integer     not null default 0,
  longest_streak     integer     not null default 0,
  -- A date, not a timestamp: the streak question is "which learner-local day
  -- was this?", and the answer is computed from learner_profiles.timezone.
  last_active_date   date,
  freezes_remaining  integer     not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint streak_records_streaks_non_negative
    check (current_streak >= 0 and longest_streak >= 0),
  constraint streak_records_current_within_longest
    check (current_streak <= longest_streak),
  constraint streak_records_freezes_range
    check (freezes_remaining between 0 and 3)
);

comment on table public.streak_records is
  'One row per learner. last_active_date is a learner-local date, resolved through the profile timezone.';

-- ---------------------------------------------------------------------------
-- Row Level Security — on now, policies in 008
-- ---------------------------------------------------------------------------
alter table public.learner_profiles  enable row level security;
alter table public.lesson_sessions   enable row level security;
alter table public.attempts          enable row level security;
alter table public.review_items      enable row level security;
alter table public.mastery_records   enable row level security;
alter table public.streak_records    enable row level security;
