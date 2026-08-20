-- 002_content_tables.sql
--
-- Global course content: the 44 phonemes, the 24 rule families, 1,240 words,
-- 560 sentence items and the 28-day programme that arranges them.
--
-- These tables are global and read-only to learners. Nothing here carries a
-- profile_id — per-learner state lives in 003_learner_tables.sql.
--
-- Conventions (03-database.md), applied to every table without exception:
--   id          uuid primary key default gen_random_uuid()
--   created_at  timestamptz not null default now()
--   updated_at  timestamptz not null default now()
-- The updated_at trigger itself arrives in 009_functions_triggers.sql.
--
-- Enumerated columns are text with a check constraint, never a Postgres enum:
-- adding a value to an enum type is a lock, adding one to a check is a migration.
-- Each check mirrors a TypeScript const union; the two must stay in sync.
--
-- RLS is enabled here, deliberately ahead of its policies in 008_rls_policies.sql.
-- RLS with no policy denies everything, so the window between this migration and
-- 008 is closed rather than open. Content is read-only to authenticated users and
-- writable only by the service role, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- phonemes — the 44 sounds of English, each annotated for a Bangla speaker
-- ---------------------------------------------------------------------------
create table if not exists public.phonemes (
  id                           uuid primary key default gen_random_uuid(),
  symbol                       text        not null unique,
  type                         text        not null,
  -- NULL is meaningful data, not missing data: Bangla has no such sound.
  -- common_bengali_substitution then says what learners actually produce.
  bangla_equivalent            text,
  articulation_note            text        not null,
  common_bengali_substitution  text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint phonemes_type_check
    check (type in ('vowel', 'consonant', 'diphthong')),
  constraint phonemes_symbol_not_blank
    check (length(btrim(symbol)) > 0)
);

comment on table public.phonemes is
  'The 44 English phonemes. bangla_equivalent NULL means Bangla lacks the sound.';

-- ---------------------------------------------------------------------------
-- rule_families — the 24 spelling and grammar rules, each with proof both ways
-- ---------------------------------------------------------------------------
create table if not exists public.rule_families (
  id               uuid primary key default gen_random_uuid(),
  code             text        not null unique,
  statement        text        not null,
  -- Exactly three examples and two counterexamples. A rule with no
  -- counterexample teaches a false absolute, so the shape is enforced here.
  examples         text[]      not null,
  counterexamples  text[]      not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint rule_families_examples_count
    check (cardinality(examples) = 3),
  constraint rule_families_counterexamples_count
    check (cardinality(counterexamples) = 2)
);

comment on table public.rule_families is
  'The 24 rule families: doubling, drop-the-e, y-to-i, silent letters, -tion/-sion, and the rest.';

-- ---------------------------------------------------------------------------
-- words — 1,240 words across 28 days
-- ---------------------------------------------------------------------------
create table if not exists public.words (
  id                   uuid        primary key default gen_random_uuid(),
  text                 text        not null unique,
  ipa                  text        not null,
  syllables            text[]      not null,
  bangla_sound         text        not null,
  bangla_meaning       text        not null,
  part_of_speech       text        not null,
  rule_family_id       uuid        references public.rule_families (id) on delete restrict,
  week_index           integer     not null,
  frequency_rank       integer,
  -- The misspellings a Bengali speaker actually produces. The dictation stage
  -- tags against these, which is what makes a wrong answer diagnostic.
  common_misspellings  text[]      not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint words_part_of_speech_check
    check (part_of_speech in (
      'noun', 'verb', 'adjective', 'adverb', 'pronoun',
      'preposition', 'conjunction', 'determiner', 'interjection'
    )),
  constraint words_week_index_range
    check (week_index between 1 and 4),
  constraint words_syllables_not_empty
    check (cardinality(syllables) > 0),
  constraint words_frequency_rank_positive
    check (frequency_rank is null or frequency_rank > 0)
);

comment on table public.words is
  'Course vocabulary. week_index 1..4 places the word in the programme, not the day.';

-- ---------------------------------------------------------------------------
-- word_phonemes — ordered phoneme sequence of a word
-- ---------------------------------------------------------------------------
-- A join table rather than a uuid[] on words: pronunciation scoring reads
-- per-phoneme accuracy across every word containing a phoneme, and that query
-- wants an index, not an array scan.
create table if not exists public.word_phonemes (
  id           uuid        primary key default gen_random_uuid(),
  word_id      uuid        not null references public.words (id) on delete cascade,
  phoneme_id   uuid        not null references public.phonemes (id) on delete restrict,
  -- 0-based position within the word, so the sequence is reconstructable.
  position     integer     not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint word_phonemes_position_non_negative
    check (position >= 0),
  constraint word_phonemes_word_position_unique
    unique (word_id, position)
);

comment on table public.word_phonemes is
  'Ordered phonemes of a word. Drives per-phoneme mastery in MasteryCalculator.';

-- ---------------------------------------------------------------------------
-- sentence_items — 560 Bangla prompts with their English targets
-- ---------------------------------------------------------------------------
create table if not exists public.sentence_items (
  id                       uuid        primary key default gen_random_uuid(),
  bangla_text              text        not null,
  english_text             text        not null,
  -- More than one English sentence is correct for most Bangla prompts. An
  -- empty array means the target is the only accepted answer.
  accepted_alternatives    text[]      not null default '{}',
  -- Chips shown alongside the correct words in the build stage.
  distractor_words         text[]      not null default '{}',
  grammar_rule_family_ids  uuid[]      not null default '{}',
  difficulty               text        not null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint sentence_items_difficulty_check
    check (difficulty in ('easy', 'medium', 'hard')),
  constraint sentence_items_bangla_not_blank
    check (length(btrim(bangla_text)) > 0),
  constraint sentence_items_english_not_blank
    check (length(btrim(english_text)) > 0)
);

comment on table public.sentence_items is
  'Bangla-to-English construction items. grammar_rule_family_ids is a tag list, not a foreign key.';

comment on column public.sentence_items.grammar_rule_family_ids is
  'Rule families this sentence exercises. Array, not a join table: it is read whole and never joined against.';

-- ---------------------------------------------------------------------------
-- program_days — the 28-day standard track and the 21-day sprint
-- ---------------------------------------------------------------------------
create table if not exists public.program_days (
  id                 uuid        primary key default gen_random_uuid(),
  track              text        not null,
  day_index          integer     not null,
  week_index         integer     not null,
  title              text        not null,
  description        text        not null,
  estimated_minutes  integer     not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint program_days_track_check
    check (track in ('standard28', 'sprint21')),
  constraint program_days_day_index_range
    check (day_index between 1 and 28),
  constraint program_days_week_index_range
    check (week_index between 1 and 4),
  constraint program_days_estimated_minutes_range
    check (estimated_minutes between 5 and 180),
  -- A track never has two day 7s.
  constraint program_days_track_day_unique
    unique (track, day_index)
);

comment on table public.program_days is
  'One row per day per track. day_index is 1..28; the sprint track simply stops at 21.';

-- ---------------------------------------------------------------------------
-- program_day_items — what a given day actually contains, in order
-- ---------------------------------------------------------------------------
-- item_id is polymorphic across words, sentence_items and rule_families, so it
-- carries no foreign key. Referential integrity is enforced by the seed CLI and
-- re-checked in 007's content validation query.
create table if not exists public.program_day_items (
  id               uuid        primary key default gen_random_uuid(),
  program_day_id   uuid        not null references public.program_days (id) on delete cascade,
  item_type        text        not null,
  item_id          uuid        not null,
  order_index      integer     not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint program_day_items_item_type_check
    check (item_type in ('word', 'sentence', 'rule_family')),
  constraint program_day_items_order_index_non_negative
    check (order_index >= 0),
  constraint program_day_items_day_type_order_unique
    unique (program_day_id, item_type, order_index)
);

comment on table public.program_day_items is
  'Ordered contents of one programme day. item_id is polymorphic, so no FK; the seed CLI validates it.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Enabled now, with no policies until 008. RLS with no policy denies every
-- client read and write, which is the correct state for content that is not yet
-- meant to be reachable. The service role bypasses RLS, so the seed CLI works.
alter table public.phonemes           enable row level security;
alter table public.rule_families      enable row level security;
alter table public.words              enable row level security;
alter table public.word_phonemes      enable row level security;
alter table public.sentence_items     enable row level security;
alter table public.program_days       enable row level security;
alter table public.program_day_items  enable row level security;
