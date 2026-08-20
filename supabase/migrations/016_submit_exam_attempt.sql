-- 016_submit_exam_attempt.sql — handing in the paper, atomically
-- ---------------------------------------------------------------------------
-- Submitting an exam writes four things: every answer's mark, the attempt's
-- score and outcome, the learner's position when they passed, and a queue of
-- drills when they did not. Over PostgREST that is four transactions, and every
-- partial outcome is worse than the failure that caused it:
--
--   * marks without an outcome — an attempt stuck `in_progress` past its
--     deadline, blocking the retake the learner has earned
--   * an outcome without the advance — somebody who passed the milestone and is
--     still on day 7 tomorrow
--   * a pass recorded without marks — a score nobody can explain, on a review
--     screen that shows nothing
--   * a fail without its prescription — rule 8's "never just a number", which
--     is the failure mode the whole product is built against
--
-- So all four happen here or none of them do.
--
-- The function computes nothing. `ExamAnswerMarker` marked the answers,
-- `ExamScoringService` weighted them, `ExamDefinition.passes()` decided the
-- outcome and `ExamPrescriptionService` chose the drills. This writes them.

create or replace function public.submit_exam_attempt(
  p_attempt_id        uuid,
  p_status            text,
  p_score_percent     numeric,
  p_section_scores    jsonb,
  p_passed            boolean,
  p_submitted_at      timestamptz,
  p_answers           jsonb default '[]'::jsonb,
  p_review_items      jsonb default '[]'::jsonb,
  p_advance_to_day    integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
begin
  -- The attempt is the anchor: every row below is forced to carry the
  -- profile_id read from it, so a payload naming somebody else writes nothing
  -- to them. Locked, so a double submit serialises rather than racing.
  select profile_id into v_profile_id
    from public.exam_attempts
   where id = p_attempt_id
   for update;

  if v_profile_id is null then
    raise exception 'exam attempt % does not exist', p_attempt_id
      using errcode = 'no_data_found';
  end if;

  -- Idempotent by construction. A retried submit — a lost response, a
  -- double-click, the cron backstop firing on an attempt the learner has just
  -- handed in — finds a row that is no longer in_progress and changes nothing.
  -- Rule 9 needs this: a double-fire must not double-submit.
  if not exists (
    select 1 from public.exam_attempts
     where id = p_attempt_id and status = 'in_progress'
  ) then
    return p_attempt_id;
  end if;

  update public.exam_answers as a
     set is_correct     = (row_in ->> 'is_correct')::boolean,
         awarded_points = (row_in ->> 'awarded_points')::numeric,
         updated_at     = now()
    from jsonb_array_elements(p_answers) as row_in
   where a.id = (row_in ->> 'id')::uuid
     and a.attempt_id = p_attempt_id;

  update public.exam_attempts
     set status         = p_status,
         score_percent  = p_score_percent,
         section_scores = p_section_scores,
         passed         = p_passed,
         submitted_at   = p_submitted_at,
         updated_at     = now()
   where id = p_attempt_id;

  -- Rule 8. The drills go through the same review_items table and the same
  -- ladder as every other wrong answer, so a word missed in an exam and the
  -- same word missed in a lesson cannot end up with two due dates.
  insert into public.review_items
    (id, profile_id, item_type, item_id, interval_index, due_at, times_seen,
     times_correct, consecutive_correct, last_correct_on, is_mastered, last_error_tags)
  select
    coalesce(nullif(row_in ->> 'id', '')::uuid, gen_random_uuid()),
    v_profile_id,
    row_in ->> 'item_type',
    (row_in ->> 'item_id')::uuid,
    (row_in ->> 'interval_index')::integer,
    (row_in ->> 'due_at')::timestamptz,
    (row_in ->> 'times_seen')::integer,
    (row_in ->> 'times_correct')::integer,
    (row_in ->> 'consecutive_correct')::integer,
    nullif(row_in ->> 'last_correct_on', '')::date,
    (row_in ->> 'is_mastered')::boolean,
    coalesce(
      array(select jsonb_array_elements_text(row_in -> 'last_error_tags')),
      '{}'::text[]
    )
  from jsonb_array_elements(p_review_items) as row_in
  on conflict (profile_id, item_type, item_id) do update set
    interval_index      = excluded.interval_index,
    due_at              = excluded.due_at,
    times_seen          = excluded.times_seen,
    times_correct       = excluded.times_correct,
    consecutive_correct = excluded.consecutive_correct,
    last_correct_on     = excluded.last_correct_on,
    is_mastered         = excluded.is_mastered,
    last_error_tags     = excluded.last_error_tags;

  -- Rule 7. Null means "do not advance": a failed attempt, an ungraded
  -- diagnostic that sets the day elsewhere, or a pass by somebody already past
  -- this point. Deciding it in the domain and passing null keeps the rule out
  -- of the database.
  if p_advance_to_day is not null then
    update public.learner_profiles
       set current_day_index = p_advance_to_day,
           updated_at        = now()
     where id = v_profile_id
       and current_day_index < p_advance_to_day;
  end if;

  return p_attempt_id;
end;
$$;

comment on function public.submit_exam_attempt(uuid, text, numeric, jsonb, boolean, timestamptz, jsonb, jsonb, integer) is
  'Marks, outcome, prescription and the learner''s position, written together or not at all. Idempotent: a second call on a submitted attempt changes nothing.';

-- Postgres grants execute to `public` on a new function, so 008's revoke sweep
-- does not reach this one. A learner able to call it could hand themselves a
-- pass and a day index.
revoke all on function public.submit_exam_attempt(uuid, text, numeric, jsonb, boolean, timestamptz, jsonb, jsonb, integer) from public, anon, authenticated;
