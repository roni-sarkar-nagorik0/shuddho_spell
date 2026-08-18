-- 007_indexes.sql
--
-- Indexes for the queries that actually run, and for nothing else. The rule from
-- `03-database.md` is that an index only exists with the query it serves named in
-- a comment, so every index below carries a `comment on index` quoting that query.
-- An index nobody can point at a query for is a write cost with no reader.
--
-- Two of the seven access paths the design lists already have a btree, because
-- Postgres implements a unique constraint with one. They are commented here
-- rather than re-created: a second identical index would double the write cost
-- of every exam answer save and question insert while serving the same reads.
-- See the `exam_answers` and `exam_questions` sections at the bottom.
--
-- Primary keys and foreign-key targets are already indexed. Foreign-key *sources*
-- are not indexed by Postgres automatically, which is why `attempts (session_id)`
-- and `words (rule_family_id, ...)` are here.

-- ---------------------------------------------------------------------------
-- review_items — the spaced-repetition due query
-- ---------------------------------------------------------------------------
-- This is the hottest read in the product: it runs on every dashboard load and
-- at the start of every practice session. `profile_id` first because it is the
-- equality predicate, `due_at` second so the range scan and the ORDER BY are
-- both satisfied by the same index without a sort.
create index if not exists review_items_profile_due_idx
  on public.review_items (profile_id, due_at);

comment on index public.review_items_profile_due_idx is
  'GetDueReviewItems: select … from review_items where profile_id = $1 and due_at <= now() order by due_at';

-- ---------------------------------------------------------------------------
-- attempts — every attempt in one lesson session
-- ---------------------------------------------------------------------------
-- Read when a session is completed and scored, and again when the learner
-- reviews what they got wrong. `session_id` is a foreign key, which Postgres
-- does not index on the referencing side; without this, completing a session
-- sequentially scans every attempt every learner has ever made.
create index if not exists attempts_session_idx
  on public.attempts (session_id);

comment on index public.attempts_session_idx is
  'CompleteLessonSession: select … from attempts where session_id = $1';

-- ---------------------------------------------------------------------------
-- lesson_sessions — a learner's session for a given day
-- ---------------------------------------------------------------------------
-- Serves both the point lookup (does a session already exist for day N, so
-- StartLessonSession resumes instead of creating a duplicate) and the whole-
-- history scan behind the 28-day progress grid.
create index if not exists lesson_sessions_profile_day_idx
  on public.lesson_sessions (profile_id, day_index);

comment on index public.lesson_sessions_profile_day_idx is
  'StartLessonSession / GetProgramOverview: select … from lesson_sessions where profile_id = $1 and day_index = $2';

-- ---------------------------------------------------------------------------
-- notifications — the learner's unread bell
-- ---------------------------------------------------------------------------
-- `read_at` is second and nullable on purpose: unread is `read_at is null`, and
-- a btree indexes nulls, so the same index answers both "how many unread" and
-- "the most recent notifications" for one profile.
create index if not exists notifications_profile_read_idx
  on public.notifications (profile_id, read_at);

comment on index public.notifications_profile_read_idx is
  'GetNotifications: select … from notifications where profile_id = $1 and read_at is null';

-- ---------------------------------------------------------------------------
-- words — content selection for a rule family and week
-- ---------------------------------------------------------------------------
-- The content pipeline and the lesson builder both pull words by the rule family
-- they teach, narrowed to the week being built. `rule_family_id` is a nullable
-- foreign key with no index of its own until now.
create index if not exists words_rule_family_week_idx
  on public.words (rule_family_id, week_index);

comment on index public.words_rule_family_week_idx is
  'GetProgramDay: select … from words where rule_family_id = $1 and week_index = $2';

-- ---------------------------------------------------------------------------
-- Already indexed by a unique constraint — documented, not duplicated
-- ---------------------------------------------------------------------------
-- `exam_answers_question_unique` (004) is `unique (question_id)`. It exists so a
-- replayed SaveExamAnswer updates rather than duplicates, and its btree is
-- exactly the index the answer lookup needs.
comment on index public.exam_answers_question_unique is
  'SaveExamAnswer / GetExamAnswerReview: select … from exam_answers where question_id = $1 — btree supplied by the unique constraint, not duplicated here';

-- `exam_questions_attempt_section_order_unique` (004) is
-- `unique (attempt_id, section_code, order_index)` — the same three columns in
-- the same order the question navigator reads them, so the paged section fetch
-- is an index scan with no sort.
comment on index public.exam_questions_attempt_section_order_unique is
  'GetExamSectionQuestions: select … from exam_questions where attempt_id = $1 and section_code = $2 order by order_index — btree supplied by the unique constraint, not duplicated here';

-- `exam_attempts_one_active_per_exam` (004) is a partial unique index, not a
-- table constraint: it enforces one live attempt per learner per exam *and* is
-- the lookup behind crash-safe resume. Created there because the rule it
-- enforces belongs with the table; commented here because this is where the
-- index rule is kept.
comment on index public.exam_attempts_one_active_per_exam is
  'GetActiveExamAttempt: select … from exam_attempts where profile_id = $1 and definition_id = $2 and status = ''in_progress''';
