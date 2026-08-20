-- 004_exam_tables.sql
--
-- The exam engine's tables. The engine is server-authoritative in every
-- dimension — clock, questions, answers, attempt count, score — so the schema
-- is written to make a client-trusted value impossible rather than merely
-- unlikely (08-exam-engine.md).
--
-- Two definitions tables (exam_definitions, exam_sections) are global content.
-- The three attempt tables are per-learner and carry profile_id for the same
-- reason 003 does: an RLS policy in 008 must never have to join to find the owner.

-- ---------------------------------------------------------------------------
-- exam_definitions — the five exams
-- ---------------------------------------------------------------------------
create table if not exists public.exam_definitions (
  id                    uuid        primary key default gen_random_uuid(),
  code                  text        not null unique,
  title                 text        not null,
  duration_seconds      integer     not null,
  question_count        integer     not null,
  -- The diagnostic has no pass mark: it sets currentDayIndex instead of being
  -- passed or failed. NULL here is that fact, not a missing value.
  pass_percent          numeric(5, 2),
  max_attempts          integer,
  cooldown_hours        integer,
  -- Unlock day on each track. The diagnostic is day 0 on both.
  unlock_day_standard   integer     not null,
  unlock_day_sprint     integer     not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint exam_definitions_code_check
    check (code in ('diagnostic', 'milestone1', 'milestone2', 'milestone3', 'final')),
  constraint exam_definitions_duration_positive
    check (duration_seconds > 0),
  constraint exam_definitions_question_count_positive
    check (question_count > 0),
  constraint exam_definitions_pass_percent_range
    check (pass_percent is null or pass_percent between 0 and 100),
  constraint exam_definitions_max_attempts_positive
    check (max_attempts is null or max_attempts > 0),
  constraint exam_definitions_cooldown_non_negative
    check (cooldown_hours is null or cooldown_hours >= 0),
  constraint exam_definitions_unlock_days_range
    check (unlock_day_standard between 0 and 28 and unlock_day_sprint between 0 and 21),
  -- A graded exam has all three of a pass mark, a limit and a cooldown, or it is
  -- the diagnostic and has none of them. A half-configured exam is what lets an
  -- unlimited retake through.
  constraint exam_definitions_grading_complete
    check (
      (pass_percent is null and max_attempts is null and cooldown_hours is null)
      or (pass_percent is not null and max_attempts is not null and cooldown_hours is not null)
    )
);

comment on table public.exam_definitions is
  'The five exams: diagnostic, milestone1..3, final. pass_percent NULL means ungraded (diagnostic only).';

-- ---------------------------------------------------------------------------
-- exam_sections — the four weighted sections of a graded exam
-- ---------------------------------------------------------------------------
-- dictation 35 · pronunciation 20 · grammar-and-construction 30 · reading-to-writing 15.
-- That the weights total 100 is a per-definition invariant, which a row-level
-- check cannot express; the seed and ExamScoringService both assert it.
create table if not exists public.exam_sections (
  id              uuid        primary key default gen_random_uuid(),
  definition_id   uuid        not null references public.exam_definitions (id) on delete cascade,
  code            text        not null,
  weight          numeric(5, 2) not null,
  order_index     integer     not null,
  question_count  integer     not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint exam_sections_code_check
    check (code in ('dictation', 'pronunciation', 'grammar_and_construction', 'reading_to_writing')),
  constraint exam_sections_weight_range
    check (weight > 0 and weight <= 100),
  constraint exam_sections_question_count_positive
    check (question_count > 0),
  constraint exam_sections_order_non_negative
    check (order_index >= 0),
  constraint exam_sections_definition_code_unique
    unique (definition_id, code),
  constraint exam_sections_definition_order_unique
    unique (definition_id, order_index)
);

comment on table public.exam_sections is
  'One row per section per exam. Sections are sequential and one-way; order_index fixes the order.';

-- ---------------------------------------------------------------------------
-- exam_attempts — one learner's run at one exam
-- ---------------------------------------------------------------------------
create table if not exists public.exam_attempts (
  id                     uuid        primary key default gen_random_uuid(),
  profile_id             uuid        not null references public.learner_profiles (id) on delete cascade,
  definition_id          uuid        not null references public.exam_definitions (id) on delete restrict,
  attempt_number         integer     not null,
  status                 text        not null default 'scheduled',
  started_at             timestamptz,
  -- Set once, at start, as now() + duration_seconds. Never extended: not on
  -- resume, not on reconnect, not at a section boundary. The client clock is
  -- display only, and every late write is rejected against this column.
  server_deadline_at     timestamptz,
  submitted_at           timestamptz,
  current_section_index  integer     not null default 0,
  score_percent          numeric(5, 2),
  -- Per-section results, keyed by section code. jsonb because the shape belongs
  -- to ExamScoringService, and a table here would be a join on every read of a
  -- value that is only ever read whole.
  section_scores         jsonb       not null default '{}'::jsonb,
  passed                 boolean,
  -- ExamBlueprintService selects the questions deterministically from this seed,
  -- so any attempt can be reproduced exactly for support or for a test.
  seed                   text        not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint exam_attempts_status_check
    check (status in ('scheduled', 'in_progress', 'submitted', 'passed', 'failed')),
  constraint exam_attempts_attempt_number_positive
    check (attempt_number >= 1),
  constraint exam_attempts_current_section_non_negative
    check (current_section_index >= 0),
  constraint exam_attempts_score_range
    check (score_percent is null or score_percent between 0 and 100),
  constraint exam_attempts_deadline_after_start
    check (server_deadline_at is null or started_at is null or server_deadline_at > started_at),
  constraint exam_attempts_submitted_after_start
    check (submitted_at is null or started_at is null or submitted_at >= started_at),
  -- A started attempt has both a start and a deadline. An attempt in progress
  -- without a deadline would be an attempt with no time limit.
  constraint exam_attempts_started_has_deadline
    check (
      status = 'scheduled'
      or (started_at is not null and server_deadline_at is not null)
    ),
  -- A finished attempt has its outcome recorded.
  constraint exam_attempts_finished_has_outcome
    check (
      status not in ('passed', 'failed')
      or (submitted_at is not null and score_percent is not null and passed is not null)
    ),
  constraint exam_attempts_number_unique
    unique (profile_id, definition_id, attempt_number)
);

comment on table public.exam_attempts is
  'One attempt. server_deadline_at is the only clock that counts; seed makes the question set reproducible.';

comment on column public.exam_attempts.server_deadline_at is
  'Set once at start. Never extended — resume recomputes remaining seconds from this, it does not move it.';

-- A learner can hold only one live attempt per exam. Without this, "start a
-- second concurrent attempt" is a race the API has to win every time; with it,
-- the database refuses. Partial, so finished attempts pile up freely.
create unique index if not exists exam_attempts_one_active_per_exam
  on public.exam_attempts (profile_id, definition_id)
  where status = 'in_progress';

-- ---------------------------------------------------------------------------
-- exam_questions — generated at attempt start, with their answers
-- ---------------------------------------------------------------------------
-- correct_answer is persisted here and must never reach a client before the
-- attempt is submitted. The column-level protection is 007/2.7; this table only
-- guarantees the column exists exactly once, on the server side of the wire.
create table if not exists public.exam_questions (
  id              uuid        primary key default gen_random_uuid(),
  attempt_id      uuid        not null references public.exam_attempts (id) on delete cascade,
  section_code    text        not null,
  order_index     integer     not null,
  type            text        not null,
  payload         jsonb       not null,
  correct_answer  jsonb       not null,
  weight          numeric(6, 3) not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint exam_questions_section_code_check
    check (section_code in ('dictation', 'pronunciation', 'grammar_and_construction', 'reading_to_writing')),
  constraint exam_questions_type_check
    check (type in ('dictation', 'pronunciation', 'multiple_choice', 'construction', 'cloze', 'reading_response')),
  constraint exam_questions_order_non_negative
    check (order_index >= 0),
  constraint exam_questions_weight_positive
    check (weight > 0),
  constraint exam_questions_attempt_section_order_unique
    unique (attempt_id, section_code, order_index)
);

comment on table public.exam_questions is
  'Questions belong to one attempt, not to a definition: the blueprint picks them per learner from the seed.';

comment on column public.exam_questions.correct_answer is
  'Server-side only. It appears in no response body before the attempt is submitted (08-exam-engine.md, rule 3).';

-- ---------------------------------------------------------------------------
-- exam_answers — one row per question, upserted as the learner works
-- ---------------------------------------------------------------------------
create table if not exists public.exam_answers (
  id               uuid        primary key default gen_random_uuid(),
  question_id      uuid        not null references public.exam_questions (id) on delete cascade,
  -- Both denormalised so an RLS policy reads the owner off the row.
  attempt_id       uuid        not null references public.exam_attempts (id) on delete cascade,
  profile_id       uuid        not null references public.learner_profiles (id) on delete cascade,
  submitted_value  text,
  is_correct       boolean,
  awarded_points   numeric(6, 3) not null default 0,
  flagged          boolean     not null default false,
  answered_at      timestamptz,
  time_spent_ms    integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint exam_answers_awarded_points_non_negative
    check (awarded_points >= 0),
  constraint exam_answers_time_spent_non_negative
    check (time_spent_ms is null or time_spent_ms >= 0),
  -- One answer per question. A replayed save updates the row it already has
  -- instead of quietly creating a second answer to the same question.
  constraint exam_answers_question_unique
    unique (question_id)
);

comment on table public.exam_answers is
  'One row per question, upserted. The unique key is what makes a replayed save idempotent.';

-- ---------------------------------------------------------------------------
-- Row Level Security — on now, policies in 008
-- ---------------------------------------------------------------------------
alter table public.exam_definitions  enable row level security;
alter table public.exam_sections     enable row level security;
alter table public.exam_attempts     enable row level security;
alter table public.exam_questions    enable row level security;
alter table public.exam_answers      enable row level security;
