-- 021_demo_attempts.sql
--
-- Every word a signed-in learner tries **on the landing page demo**.
--
-- It is not `attempts`, and the reason is structural rather than stylistic:
-- `attempts.session_id` is `not null references lesson_sessions`, because an
-- attempt in the course is always part of a run through a day. The demo has no
-- session and never will — it is one word at a time, on a public page, with no
-- programme position behind it. Making `session_id` nullable to accommodate it
-- would weaken a constraint that is load-bearing for every real attempt in
-- order to store something that is not one.
--
-- So the two stay apart, and the dashboard shows them apart: what the course
-- taught, and what was tried at the front door. Merging them into a single
-- "words practised" figure would let a visitor who pressed *Next word* forty
-- times report a day's learning they did not do.
--
-- **No anonymous rows.** `profile_id` is `not null`: a visitor with no account
-- is not being recorded, because there is nobody to show it to and no consent
-- to record it under. The demo posts nothing until there is a session.

create table if not exists public.demo_attempts (
  id              uuid        primary key default gen_random_uuid(),
  profile_id      uuid        not null references public.learner_profiles (id) on delete cascade,
  word_id         uuid        not null references public.words (id) on delete cascade,
  -- What the learner typed. Kept because "which words do I keep getting wrong"
  -- is unanswerable from a boolean, and it is the same reason `attempts` keeps
  -- `submitted_value`.
  submitted_value text        not null,
  -- Decided by the server from `Word.matches`, never sent by the client.
  -- `CLAUDE.md`: no client-trusted identity, score, deadline or attempt count.
  is_correct      boolean     not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.demo_attempts is
  'One word tried on the public demo by a signed-in learner. Separate from attempts, which always belongs to a lesson session.';

comment on column public.demo_attempts.is_correct is
  'Server-decided via Word.matches. The client posts what was typed, never whether it was right.';

-- ---------------------------------------------------------------------------
-- RLS — the learner reads their own, and writes none of it
-- ---------------------------------------------------------------------------
-- The same shape 008 gives every learner table: 003's rule is that RLS is
-- written as if the API did not exist. A select policy so a learner could only
-- ever see their own practice, and **no insert policy at all** — the row is
-- written by the server through the service client, after it has decided
-- whether the answer was right. A client able to insert here could report a
-- hundred correct words it never typed.
alter table public.demo_attempts enable row level security;

grant select on public.demo_attempts to authenticated;

drop policy if exists demo_attempts_select_own on public.demo_attempts;
create policy demo_attempts_select_own
  on public.demo_attempts for select
  to authenticated
  using (profile_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- The dashboard's read
-- ---------------------------------------------------------------------------
-- 007's convention: an index comment names the query it serves.
create index if not exists demo_attempts_profile_created_at
  on public.demo_attempts (profile_id, created_at desc);

comment on index public.demo_attempts_profile_created_at is
  'GetWordsPractised: select word_id, submitted_value, is_correct, created_at from demo_attempts where profile_id = $1 and created_at >= $2 order by created_at desc — the learner-local day boundary, so the range scan is the index';

-- `updated_at` is maintained by 009's trigger, which is attached by a loop over
-- every table in `public` carrying the column. That loop already ran, so this
-- table needs its own — the loop is not re-run by a later migration.
drop trigger if exists set_updated_at_demo_attempts on public.demo_attempts;
create trigger set_updated_at_demo_attempts
  before update on public.demo_attempts
  for each row execute function public.set_updated_at();
