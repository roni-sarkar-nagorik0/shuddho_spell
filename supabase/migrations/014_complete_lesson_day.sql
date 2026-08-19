-- 014_complete_lesson_day.sql — finishing a day, including moving on from it
-- ---------------------------------------------------------------------------
-- 009's `complete_lesson_session` closes the session, upserts the streak and
-- writes any batched rows. It does not touch `learner_profiles`, because when
-- it was written nothing in the application advanced a learner's position —
-- F4.12 is what made `current_day_index` something the app moves.
--
-- That leaves a real hole. Completing a day is two statements: close the
-- session, advance the learner. Over PostgREST they are two transactions, and a
-- failure between them leaves a learner who finished day 5 and is still on
-- day 5 — they are sent back through a day they have already done, which is
-- visible, annoying and entirely avoidable.
--
-- A new function rather than a replacement: `create or replace` with a
-- different argument list creates an overload, not a replacement, and two
-- functions differing only by a defaulted parameter is an ambiguity waiting to
-- be resolved wrongly. 009's function is left exactly as it shipped —
-- migrations are forward-only.
--
-- Like everything else here it computes nothing. The domain decided the day
-- index, and 003's `current_day_index between 1 and 28` is the backstop.

create or replace function public.complete_lesson_day(
  p_session_id         uuid,
  p_items_total        integer,
  p_items_correct      integer,
  p_streak             jsonb   default null,
  p_current_day_index  integer default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
begin
  select profile_id into v_profile_id
    from public.lesson_sessions
   where id = p_session_id
   for update;

  if v_profile_id is null then
    raise exception 'lesson session % does not exist', p_session_id
      using errcode = 'no_data_found';
  end if;

  update public.lesson_sessions
     set completed_at  = coalesce(completed_at, now()),
         items_total   = p_items_total,
         items_correct = p_items_correct
   where id = p_session_id;

  if p_streak is not null then
    insert into public.streak_records
      (profile_id, current_streak, longest_streak, last_active_date, freezes_remaining)
    values (
      v_profile_id,
      (p_streak ->> 'current_streak')::integer,
      (p_streak ->> 'longest_streak')::integer,
      nullif(p_streak ->> 'last_active_date', '')::date,
      coalesce((p_streak ->> 'freezes_remaining')::integer, 0)
    )
    on conflict (profile_id) do update set
      current_streak    = excluded.current_streak,
      longest_streak    = excluded.longest_streak,
      last_active_date  = excluded.last_active_date,
      freezes_remaining = excluded.freezes_remaining;
  end if;

  -- Null when the finished day is not the day the learner is on — revisiting
  -- day 3 to practise must not move them forward from day 7.
  if p_current_day_index is not null then
    update public.learner_profiles
       set current_day_index = p_current_day_index
     where id = v_profile_id;
  end if;
end;
$$;

comment on function public.complete_lesson_day(uuid, integer, integer, jsonb, integer) is
  'Closes a lesson session, upserts the streak and advances the learner, in one transaction. Supersedes complete_lesson_session for the application write path.';

revoke all on function public.complete_lesson_day(uuid, integer, integer, jsonb, integer) from public, anon, authenticated;
