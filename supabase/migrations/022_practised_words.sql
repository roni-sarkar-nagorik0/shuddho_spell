-- 022_practised_words.sql
--
-- One page of "every word this learner has practised", newest first.
--
-- This is a function rather than a repository read, and the reason is the
-- grouping. The screen shows **one row per word** with the number of tries
-- beside it, over a history that is meant to grow for months; producing that in
-- the application means fetching every attempt the learner has ever made and
-- reducing it in memory, which works for a week and then quietly does not.
--
-- `IDatabase` deliberately cannot express a `group by` — it is a narrowing, not
-- a query builder — and widening it to accommodate one screen would make it the
-- ORM `CLAUDE.md` bans. 013, 014 and 015 already set the precedent: when a
-- statement is genuinely one statement, it is a Postgres function.
--
-- **It computes nothing.** No score, no interval, no rule about learning.
-- Counting rows and paging them is not business logic a domain service should
-- own; `CLAUDE.md` §10's prohibition is about the rules, and there are none
-- here.

create or replace function public.practised_words(
  p_profile_id uuid,
  -- 'course', 'demo' or 'all'. Named rather than two functions, because the
  -- three differ by one predicate and three copies would drift.
  p_source     text,
  p_limit      int,
  p_offset     int
)
returns table (
  word_id      uuid,
  text         text,
  ipa          text,
  bangla_sound text,
  tries        bigint,
  -- True once the learner has spelled it right at least once, from any source.
  settled      boolean,
  last_at      timestamptz,
  -- Distinct words matching the filter, repeated on every row. One query
  -- rather than a second round trip whose answer could disagree with this one.
  total_count  bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with practised as (
    -- The course. `item_type = 'word'` because `attempts` also holds sentence
    -- construction, and a sentence is not a word on a list of words.
    select a.item_id as word_id, a.is_correct, a.created_at
      from public.attempts a
     where a.profile_id = p_profile_id
       and a.item_type = 'word'
       and p_source in ('course', 'all')

    union all

    -- The demo — 021. Kept separate everywhere it is *shown*; unioned here only
    -- because 'all' is one of the three things a caller can ask for.
    select d.word_id, d.is_correct, d.created_at
      from public.demo_attempts d
     where d.profile_id = p_profile_id
       and p_source in ('demo', 'all')
  ),
  grouped as (
    select p.word_id,
           count(*)                       as tries,
           bool_or(p.is_correct)          as settled,
           max(p.created_at)              as last_at
      from practised p
     group by p.word_id
  )
  select g.word_id,
         w.text,
         w.ipa,
         w.bangla_sound,
         g.tries,
         g.settled,
         g.last_at,
         count(*) over () as total_count
    from grouped g
    -- An inner join, so a word the content pipeline has dropped leaves the list
    -- rather than rendering a row with no word in it.
    join public.words w on w.id = g.word_id
   order by g.last_at desc, w.text asc
   limit greatest(p_limit, 0)
  offset greatest(p_offset, 0);
$$;

comment on function public.practised_words(uuid, text, int, int) is
  'One page of distinct words a learner has practised, with tries and whether it has been spelled right. Groups attempts and demo_attempts; total_count is the full size of the filtered set.';

-- 008's baseline revoked everything from the client roles, but a function
-- created afterwards is granted `execute` to `public` by default — so this
-- revoke is load-bearing, exactly as 009 says. The service client calls it; the
-- learner's own never does, and `security definer` means it must not be able
-- to, because the function takes the profile id as an argument rather than
-- deriving it from the session.
revoke execute on function public.practised_words(uuid, text, int, int) from public, anon, authenticated;
