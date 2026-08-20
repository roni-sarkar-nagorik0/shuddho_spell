-- 015_start_exam_attempt.sql — the attempt and its paper, together
-- ---------------------------------------------------------------------------
-- Starting an exam writes one `exam_attempts` row and up to 150
-- `exam_questions` rows. Over PostgREST that is two requests and therefore two
-- transactions, and the failure between them is not a cosmetic one: an
-- `in_progress` attempt with no questions is unanswerable, unsubmittable, and —
-- because of `exam_attempts_one_active_per_exam` — permanently blocks the
-- learner from starting the exam again. The worst possible outcome from a
-- dropped connection.
--
-- So both writes happen here, in one transaction, or neither does.
--
-- Like 009 and 013 this computes nothing. `ExamBlueprintService` chose the
-- questions from the attempt's seed and `ExamAttempt.start()` fixed the
-- deadline; the function writes what it is handed. The one exception is
-- `attempt_number`, which is derived here on purpose: it is a count over rows
-- this statement is inserting into, and a number computed in TypeScript from a
-- count read a moment earlier is the classic lost update — two tabs, two
-- attempt ones, and the unique constraint rejecting the second.

create or replace function public.start_exam_attempt(
  p_profile_id     uuid,
  p_definition_id  uuid,
  p_attempt        jsonb,
  p_questions      jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt_id      uuid;
  v_attempt_number  integer;
begin
  -- Lock the learner's row for this exam so two concurrent starts serialise.
  -- The partial unique index already refuses the second in_progress attempt;
  -- this is what stops the two of them racing to the same attempt_number.
  perform 1 from public.learner_profiles where id = p_profile_id for update;

  select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
    from public.exam_attempts
   where profile_id = p_profile_id
     and definition_id = p_definition_id;

  insert into public.exam_attempts
    (id, profile_id, definition_id, attempt_number, status, started_at,
     server_deadline_at, current_section_index, section_scores, seed)
  values (
    coalesce(nullif(p_attempt ->> 'id', '')::uuid, gen_random_uuid()),
    -- From the argument, never from the payload: a body naming somebody else's
    -- profile writes an attempt for the caller, not for them.
    p_profile_id,
    p_definition_id,
    v_attempt_number,
    'in_progress',
    coalesce((p_attempt ->> 'started_at')::timestamptz, now()),
    (p_attempt ->> 'server_deadline_at')::timestamptz,
    0,
    '{}'::jsonb,
    p_attempt ->> 'seed'
  )
  returning id into v_attempt_id;

  insert into public.exam_questions
    (id, attempt_id, section_code, order_index, type, payload, correct_answer, weight)
  select
    coalesce(nullif(row_in ->> 'id', '')::uuid, gen_random_uuid()),
    v_attempt_id,
    row_in ->> 'section_code',
    (row_in ->> 'order_index')::integer,
    row_in ->> 'type',
    row_in -> 'payload',
    row_in -> 'correct_answer',
    (row_in ->> 'weight')::numeric
  from jsonb_array_elements(p_questions) as row_in;

  return v_attempt_id;
end;
$$;

comment on function public.start_exam_attempt(uuid, uuid, jsonb, jsonb) is
  'One attempt and its whole paper, written atomically. attempt_number is derived here so two concurrent starts cannot both claim the same one.';

-- Postgres grants execute to `public` on a new function, so 008's revoke sweep
-- does not reach this one. A learner able to call it directly could mint an
-- attempt with any deadline they liked.
revoke all on function public.start_exam_attempt(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
