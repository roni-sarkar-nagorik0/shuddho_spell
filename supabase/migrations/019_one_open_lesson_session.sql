-- 019_one_open_lesson_session.sql
--
-- A learner may hold one unfinished lesson session per day, and the database is
-- what says so.
--
-- `StartLessonSessionUseCase` documents itself as idempotent — "a page load and
-- its own prefetch are enough to send this twice" — but it is a read followed by
-- an insert with nothing between them. Two requests 6ms apart both read no open
-- session and both insert one, which is exactly what happened the first time a
-- learner opened day 1 in a development build: React's StrictMode mounts an
-- effect twice, and the table ended up with two open sessions for the same day.
--
-- The damage is not the duplicate row. It is that `findOpenForDay` reads with
-- `maybeSingle()`, so from the second row onwards *every* attempt to open that
-- day fails outright — a learner locked out of a lesson by having opened it too
-- fast once.
--
-- 004 already settled this shape for exams:
--
--   create unique index exam_attempts_one_active_per_exam
--     on public.exam_attempts (profile_id, definition_id)
--     where status = 'in_progress';
--
-- This is the same index for the same reason. Partial, so finished sessions pile
-- up freely and a learner can sit day 3 again next month.

-- ---------------------------------------------------------------------------
-- Close the duplicates that already exist
-- ---------------------------------------------------------------------------
-- Forward-only means this migration has to cope with tables the index would
-- reject. Nothing is deleted: a session is a learner's history even when it is
-- three seconds long and was created by a double mount. The newest open session
-- per day is kept — it is the one the browser is holding — and the older
-- duplicates are marked finished so they stop being "open" without ceasing to
-- exist. Their attempts, if any, stay attached to them.
with ranked as (
  select id,
         row_number() over (
           partition by profile_id, day_index
           order by started_at desc, id desc
         ) as rank
    from public.lesson_sessions
   where completed_at is null
)
update public.lesson_sessions as target
   set completed_at = target.started_at,
       updated_at   = now()
  from ranked
 where ranked.id = target.id
   and ranked.rank > 1;

-- ---------------------------------------------------------------------------
-- One open session per learner per day
-- ---------------------------------------------------------------------------
create unique index if not exists lesson_sessions_one_open_per_day
  on public.lesson_sessions (profile_id, day_index)
  where completed_at is null;

-- 007's convention: an index comment names the query it serves. This one serves
-- a write rather than a read, but it is the same query underneath — the lookup
-- `StartLessonSession` makes before deciding whether to insert, promoted from a
-- hint the planner may take to a rule the database enforces.
comment on index public.lesson_sessions_one_open_per_day is
  'StartLessonSession: select … from lesson_sessions where profile_id = $1 and day_index = $2 and completed_at is null — unique, so the insert that follows the read cannot race a second one in';
