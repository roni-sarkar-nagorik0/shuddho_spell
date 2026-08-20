-- 017_submit_exam_attempt_v2.sql — the backstop can mark what pg_cron handed in
-- ---------------------------------------------------------------------------
-- 016 guarded its whole body on `status = 'in_progress'`, which made a retried
-- submit a no-op — exactly right for rule 9's "a double-fire must not
-- double-submit".
--
-- It was also too narrow, and 009 is why. The database's own pg_cron job moves
-- an expired attempt to `submitted` **without grading it**, deliberately: the
-- deadline passing is not a grade, and scoring belongs to the engine. So the
-- backstop meets attempts that are already handed in and have never been
-- marked, and 016 would have refused every one of them — an attempt with no
-- score, no outcome and no prescription, sitting there forever.
--
-- `create or replace` with the identical signature, so this replaces the body
-- and nothing else. Migrations are forward-only; 016 is not edited.
--
-- The guard becomes "still open, or handed in and never marked". Both idempotence
-- and the backstop follow from it: a graded attempt has a score, so a second
-- call still changes nothing.

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
  select profile_id into v_profile_id
    from public.exam_attempts
   where id = p_attempt_id
   for update;

  if v_profile_id is null then
    raise exception 'exam attempt % does not exist', p_attempt_id
      using errcode = 'no_data_found';
  end if;

  -- Still open, or handed in by pg_cron and never marked. Anything else has
  -- already been through here, and a second call changes nothing.
  if not exists (
    select 1 from public.exam_attempts
     where id = p_attempt_id
       and (status = 'in_progress' or (status = 'submitted' and score_percent is null))
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
         -- Kept, not overwritten, when pg_cron already stamped it: the paper
         -- was handed in at the deadline, not at the moment somebody marked it.
         submitted_at   = coalesce(submitted_at, p_submitted_at),
         updated_at     = now()
   where id = p_attempt_id;

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
  'Marks, outcome, prescription and the learner''s position, written together or not at all. Accepts an attempt still open or one pg_cron handed in unmarked; a second call on a graded attempt changes nothing.';

revoke all on function public.submit_exam_attempt(uuid, text, numeric, jsonb, boolean, timestamptz, jsonb, jsonb, integer) from public, anon, authenticated;
