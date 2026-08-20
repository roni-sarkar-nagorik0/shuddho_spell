-- 013_record_lesson_attempt.sql — the per-answer transaction
-- ---------------------------------------------------------------------------
-- 009 made session *completion* atomic. Every individual answer has the same
-- problem and never had the same answer: submitting one dictation attempt
-- writes an `attempts` row, moves the session's counters, upserts a
-- `review_items` row and upserts `mastery_records`. Four statements.
--
-- Over PostgREST those are four HTTP requests and therefore four transactions.
-- A failure after the second leaves a learner whose review ladder advanced and
-- whose mastery did not — silent, permanent, and only noticed weeks later when
-- the numbers disagree. `IUnitOfWork` as a callback cannot fix that; nothing in
-- TypeScript can. Only the database can.
--
-- Like 009's function, this computes nothing. The domain decided the score, the
-- tags, the ladder position and the mastery counts; this writes them together
-- or not at all.

create or replace function public.record_lesson_attempt(
  p_session_id  uuid,
  p_attempt     jsonb,
  p_review_item jsonb default null,
  p_mastery     jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id  uuid;
  v_attempt_id  uuid;
  v_is_correct  boolean;
begin
  -- The session is the anchor, exactly as in complete_lesson_session: every row
  -- below is forced to carry its profile_id, so a payload naming somebody
  -- else's profile cannot land no matter what the caller sent.
  select profile_id into v_profile_id
    from public.lesson_sessions
   where id = p_session_id
   for update;

  if v_profile_id is null then
    raise exception 'lesson session % does not exist', p_session_id
      using errcode = 'no_data_found';
  end if;

  v_is_correct := (p_attempt ->> 'is_correct')::boolean;

  insert into public.attempts
    (id, session_id, profile_id, item_type, item_id, mode, submitted_value,
     is_correct, score, error_tags, latency_ms)
  values (
    coalesce(nullif(p_attempt ->> 'id', '')::uuid, gen_random_uuid()),
    p_session_id,
    v_profile_id,
    p_attempt ->> 'item_type',
    (p_attempt ->> 'item_id')::uuid,
    p_attempt ->> 'mode',
    p_attempt ->> 'submitted_value',
    v_is_correct,
    (p_attempt ->> 'score')::numeric,
    coalesce(
      (select array_agg(tag) from jsonb_array_elements_text(p_attempt -> 'error_tags') as tag),
      '{}'
    ),
    nullif(p_attempt ->> 'latency_ms', '')::integer
  )
  returning id into v_attempt_id;

  -- The session's running totals. Incremented here rather than written from a
  -- number the caller computed: two answers submitted at once would otherwise
  -- each write "the total as I saw it" and one of them would be lost.
  update public.lesson_sessions
     set items_total   = items_total + 1,
         items_correct = items_correct + (case when v_is_correct then 1 else 0 end)
   where id = p_session_id;

  if p_review_item is not null then
    insert into public.review_items
      (profile_id, item_id, item_type, interval_index, due_at, times_seen,
       times_correct, consecutive_correct, last_correct_on, is_mastered, last_error_tags)
    values (
      v_profile_id,
      (p_review_item ->> 'item_id')::uuid,
      p_review_item ->> 'item_type',
      (p_review_item ->> 'interval_index')::integer,
      (p_review_item ->> 'due_at')::timestamptz,
      (p_review_item ->> 'times_seen')::integer,
      (p_review_item ->> 'times_correct')::integer,
      (p_review_item ->> 'consecutive_correct')::integer,
      nullif(p_review_item ->> 'last_correct_on', '')::date,
      (p_review_item ->> 'is_mastered')::boolean,
      coalesce(
        (select array_agg(tag) from jsonb_array_elements_text(p_review_item -> 'last_error_tags') as tag),
        '{}'
      )
    )
    on conflict (profile_id, item_type, item_id) do update set
      interval_index      = excluded.interval_index,
      due_at              = excluded.due_at,
      times_seen          = excluded.times_seen,
      times_correct       = excluded.times_correct,
      consecutive_correct = excluded.consecutive_correct,
      last_correct_on     = excluded.last_correct_on,
      is_mastered         = excluded.is_mastered,
      last_error_tags     = excluded.last_error_tags;
  end if;

  insert into public.mastery_records
    (profile_id, dimension, dimension_id, attempts, correct, accuracy, last_updated_at)
  select
    v_profile_id,
    row_in ->> 'dimension',
    (row_in ->> 'dimension_id')::uuid,
    (row_in ->> 'attempts')::integer,
    (row_in ->> 'correct')::integer,
    (row_in ->> 'accuracy')::numeric,
    now()
  from jsonb_array_elements(p_mastery) as row_in
  on conflict (profile_id, dimension, dimension_id) do update set
    attempts        = excluded.attempts,
    correct         = excluded.correct,
    accuracy        = excluded.accuracy,
    last_updated_at = excluded.last_updated_at;

  return v_attempt_id;
end;
$$;

comment on function public.record_lesson_attempt(uuid, jsonb, jsonb, jsonb) is
  'One answer, written atomically: the attempt row, the session counters, the review ladder and the mastery records. Computes nothing — the domain decided all of it.';

-- Postgres grants execute to `public` on a new function, so 008's revoke sweep
-- does not reach this one. A learner able to call it directly could write an
-- attempt claiming any score against any item.
revoke all on function public.record_lesson_attempt(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
