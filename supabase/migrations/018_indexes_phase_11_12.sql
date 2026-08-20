-- 018_indexes_phase_11_12.sql
--
-- The indexes the screens built in Phases 11 and 12 need, found by the
-- performance pass (F13.7).
--
-- Same rule as 007: an index only exists with the query it serves named in a
-- `comment on index`. An index nobody can point at a query for is a write cost
-- with no reader, and this table is written on every answer a learner gives.
--
-- `if not exists` throughout, so a re-run is a no-op rather than a second
-- identical index doubling the write cost.

-- --------------------------------------------------------------------------
-- GetWeeklyActivity, on every dashboard load.
--
-- `attempts` is the largest learner table in the product — one row per answer,
-- so a learner finishing the programme has thousands. The activity panel reads
-- the most recent slice ordered by `created_at`, and without this the plan is a
-- sequential scan of the learner's whole history followed by a sort, on the
-- screen they open most.
--
-- Descending on `created_at` because that is the direction the query asks for;
-- a btree can be walked either way, but matching the order removes the sort
-- node outright.
create index if not exists attempts_profile_created_idx
  on public.attempts (profile_id, created_at desc);

comment on index public.attempts_profile_created_idx is
  'GetWeeklyActivity: select … from attempts where profile_id = $1 order by created_at desc limit $2';

-- --------------------------------------------------------------------------
-- GetExamCatalogue and ListExamMilestones, five reads each.
--
-- 004 already has `exam_attempts_one_active_per_exam`, but that is a **partial**
-- unique index restricted to `status = 'in_progress'` — it answers "is there a
-- live attempt?" and nothing else. The catalogue asks for *every* attempt at an
-- exam to count them against the limit, work out the cooldown and find the best
-- score, and the partial index cannot serve that query at all.
--
-- Five of these run per catalogue render, so this is the difference between one
-- page load and five sequential scans.
create index if not exists exam_attempts_profile_definition_idx
  on public.exam_attempts (profile_id, definition_id, attempt_number desc);

comment on index public.exam_attempts_profile_definition_idx is
  'GetExamCatalogue / ListExamMilestones / GetNextExam: select … from exam_attempts where profile_id = $1 and definition_id = $2 order by attempt_number desc';

-- --------------------------------------------------------------------------
-- The library's keyset page.
--
-- `words.text` is already unique from 002, and a unique constraint is a btree —
-- so the keyset scan `where text > $1 order by text limit $2` is already served
-- and **no index is created here**. Documented rather than duplicated, exactly
-- as 007 does for `exam_answers_question_unique`.
comment on index public.words_text_key is
  'GetLibraryPage: select … from words where text > $1 order by text asc limit $2 — the keyset page';

-- --------------------------------------------------------------------------
-- Certificate verification, and the idempotence check behind issuing one.
--
-- Both columns are already unique from 006 — `verification_code` for the public
-- lookup and `exam_attempt_id` for "has this attempt already earned one?".
-- Documented for the same reason.
comment on constraint certificates_attempt_unique on public.certificates is
  'IssueCertificate idempotence: select … from certificates where exam_attempt_id = $1';
