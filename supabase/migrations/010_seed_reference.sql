-- 010_seed_reference.sql
--
-- The reference data the whole course is measured against: the 44 phonemes of
-- English and the 24 rule families. Everything else in the content tables
-- (words, sentence items, the 28 days) is authored in Phase 9 and arrives
-- through `pnpm content:seed`, not through a migration. These two tables are
-- different: they are fixed linguistic facts, they never change per deployment,
-- and Phase 4 domain services key their mastery dimensions off them. A database
-- without them is not a database this application can boot against.
--
-- Idempotent by natural key rather than by `if not exists`: `symbol` and `code`
-- are unique, and a re-run updates the annotation in place instead of inserting
-- a duplicate. That also means a correction to a Bangla note ships as a new
-- numbered migration that re-states the row, never as an edit to this file.
--
-- Every annotation below is a statement about Bangla phonology or English
-- orthography, not a placeholder. `bangla_equivalent` is null only where Bangla
-- genuinely lacks the sound, and where it is null,
-- `common_bengali_substitution` says what learners produce instead — that pair
-- is what the pronunciation scorer in Phase 6 turns into feedback.

-- ---------------------------------------------------------------------------
-- phonemes — 12 vowels, 8 diphthongs, 24 consonants
-- ---------------------------------------------------------------------------
-- Symbols are bare IPA, no slashes: the delimiters belong to the presentation
-- layer, and storing them would make every lookup a string-trim.
insert into public.phonemes
  (symbol, type, bangla_equivalent, articulation_note, common_bengali_substitution)
values
  -- Vowels (12). Bangla has seven oral vowel qualities and no length contrast,
  -- so each English long/short pair collapses onto one Bangla vowel.
  ('iː', 'vowel', 'ই',
   'Close front unrounded. The tongue is high and forward, the lips spread, and the vowel is held long.',
   'Produced as short ই. Length is not contrastive in Bangla, so seat and sit fall together.'),
  ('ɪ', 'vowel', 'ই',
   'Near-close near-front unrounded, lax and short. The tongue sits lower and more central than for the long vowel.',
   'Produced as the same ই used for the long vowel, so sit and seat sound alike.'),
  ('e', 'vowel', 'এ',
   'Mid front unrounded. The lips are neutral and the jaw only slightly open.',
   null),
  ('æ', 'vowel', 'অ্যা',
   'Near-open front unrounded. The jaw drops further than for the mid front vowel.',
   null),
  ('ɑː', 'vowel', 'আ',
   'Open back unrounded, held long. The tongue is low and pulled back.',
   'Produced as the central আ, which sits further forward than the English back vowel.'),
  ('ɒ', 'vowel', 'অ',
   'Open back rounded and short, with light lip rounding.',
   'Produced as অ, which also serves the long back vowel and the mid central one, so cot, caught and cut converge.'),
  ('ɔː', 'vowel', 'অ',
   'Open-mid back rounded, held long, with firm lip rounding.',
   'Produced as short অ or as ও, which moves caught towards coat.'),
  ('ʊ', 'vowel', 'উ',
   'Near-close near-back rounded, lax and short.',
   'Produced as উ, the same vowel used for the long one, so full and fool merge.'),
  ('uː', 'vowel', 'উ',
   'Close back rounded, held long. The tongue is high and back and the lips are tightly rounded.',
   'Produced as উ, so the contrast with the short vowel is lost.'),
  ('ʌ', 'vowel', 'অ',
   'Open-mid back unrounded and short. The jaw is more open than for the unstressed central vowel.',
   'Produced as অ, which is rounded, so cut approaches cot.'),
  ('ɜː', 'vowel', null,
   'Mid central unrounded, held long, lips neutral. In the standard accent the following r is not pronounced.',
   'No Bangla counterpart. আ or অ্যা is used and the র is sounded, so bird comes out as bard with an audible r.'),
  ('ə', 'vowel', null,
   'Mid central, always unstressed and very short. It is the commonest vowel in English.',
   'Bangla does not reduce unstressed vowels, so the spelling vowel is given full value and about begins with আ.'),

  -- Diphthongs (8). Bangla has true diphthongs, but not the centring ones,
  -- and the two closing glides towards a mid vowel are usually flattened.
  ('eɪ', 'diphthong', 'এই',
   'Glides from a mid front vowel towards a close front one. The first element is the longer of the two.',
   'Flattened to a single এ, so late sounds like a lengthened let.'),
  ('aɪ', 'diphthong', 'আই',
   'Glides from an open central vowel towards a close front one.',
   null),
  ('ɔɪ', 'diphthong', 'ঐ',
   'Glides from an open-mid back rounded vowel towards a close front one.',
   null),
  ('aʊ', 'diphthong', 'আউ',
   'Glides from an open central vowel towards a close back rounded one.',
   null),
  ('əʊ', 'diphthong', null,
   'Glides from a mid central vowel towards a close back rounded one.',
   'Flattened to ও, so no and know lose the glide entirely.'),
  ('ɪə', 'diphthong', null,
   'Glides from a near-close front vowel towards the unstressed central vowel. The r in the spelling is not pronounced.',
   'Produced as ই plus a full আ with an audible র, so here becomes hiyar.'),
  ('eə', 'diphthong', null,
   'Glides from a mid front vowel towards the unstressed central vowel. The r in the spelling is not pronounced.',
   'Produced as এ plus a full আ with an audible র, so hair becomes heyar.'),
  ('ʊə', 'diphthong', null,
   'Glides from a near-close back rounded vowel towards the unstressed central vowel.',
   'Produced as উ plus a full আ with an audible র, so tour becomes tuar.'),

  -- Consonants (24). The two that cost a Bengali speaker the most are the
  -- alveolar stops, which Bangla splits into dental and retroflex with nothing
  -- in between, and the labiodental fricatives, which Bangla lacks outright.
  ('p', 'consonant', 'প',
   'Voiceless bilabial stop. The lips close completely and then release.',
   'Bangla প is unaspirated while English p is aspirated at the start of a word, so pin can be heard as bin.'),
  ('b', 'consonant', 'ব',
   'Voiced bilabial stop. The lips close and the vocal folds vibrate through the closure.',
   null),
  ('t', 'consonant', null,
   'Voiceless alveolar stop. The tongue tip touches the ridge behind the upper teeth.',
   'Bangla has dental ত and retroflex ট and nothing between them, so ট is substituted and t acquires a retroflex colour.'),
  ('d', 'consonant', null,
   'Voiced alveolar stop. The tongue tip touches the ridge behind the upper teeth.',
   'Retroflex ড is substituted for the same reason as the voiceless one.'),
  ('k', 'consonant', 'ক',
   'Voiceless velar stop. The back of the tongue presses against the soft palate.',
   'Bangla ক is unaspirated, so an initial k lacks the English release of breath.'),
  ('ɡ', 'consonant', 'গ',
   'Voiced velar stop. The back of the tongue presses against the soft palate and the vocal folds vibrate.',
   null),
  ('tʃ', 'consonant', 'চ',
   'Voiceless post-alveolar affricate. A stop released slowly into a fricative.',
   null),
  ('dʒ', 'consonant', 'জ',
   'Voiced post-alveolar affricate.',
   null),
  ('f', 'consonant', 'ফ',
   'Voiceless labiodental fricative. The upper teeth rest on the lower lip and air is forced between them.',
   'ফ is [f] for most Bangladeshi speakers but an aspirated bilabial stop for many others, who produce fan as phan.'),
  ('v', 'consonant', null,
   'Voiced labiodental fricative. As its voiceless partner, with the vocal folds vibrating.',
   'Absent from Bangla. ভ or ব is substituted, so very becomes bhery.'),
  ('θ', 'consonant', null,
   'Voiceless dental fricative. The tongue tip sits against or between the teeth and air is forced through.',
   'Absent from Bangla. The dental stop থ is substituted, so think becomes tink.'),
  ('ð', 'consonant', null,
   'Voiced dental fricative. As its voiceless partner, with the vocal folds vibrating.',
   'Absent from Bangla. The dental stop দ is substituted, so this becomes dis.'),
  ('s', 'consonant', 'স',
   'Voiceless alveolar fricative. A narrow groove along the tongue directs the air at the teeth.',
   'Bangla স is pronounced as শ in most positions, so see is often produced as she.'),
  ('z', 'consonant', null,
   'Voiced alveolar fricative.',
   'Absent from Bangla. জ is substituted, so zoo becomes joo.'),
  ('ʃ', 'consonant', 'শ',
   'Voiceless post-alveolar fricative. The tongue is drawn back and the lips are slightly rounded.',
   null),
  ('ʒ', 'consonant', null,
   'Voiced post-alveolar fricative. It never begins a native English word.',
   'Absent from Bangla. জ is substituted, so measure becomes mejar.'),
  ('h', 'consonant', 'হ',
   'Voiceless glottal fricative. The vocal tract stays open and the breath is audible.',
   null),
  ('m', 'consonant', 'ম',
   'Voiced bilabial nasal. The lips close and the air escapes through the nose.',
   null),
  ('n', 'consonant', 'ন',
   'Voiced alveolar nasal. The tongue tip touches the ridge behind the upper teeth.',
   'Bangla ন is dental, articulated a little further forward than the English one.'),
  ('ŋ', 'consonant', 'ঙ',
   'Voiced velar nasal. It never begins a word in English.',
   'The sound exists, but the spelling ng invites a following গ, so singer can gain a hard g.'),
  ('l', 'consonant', 'ল',
   'Voiced alveolar lateral. The air passes around the sides of the tongue.',
   'Bangla ল is always clear, so the dark l English uses after a vowel is not distinguished.'),
  ('r', 'consonant', null,
   'Voiced post-alveolar approximant. The tongue tip approaches the ridge without touching it.',
   'Bangla র is a tap or a trill and is sounded wherever it is written, so car and park gain an audible r.'),
  ('w', 'consonant', null,
   'Voiced labial-velar approximant. The lips round while the back of the tongue rises.',
   'Bangla has [w] only as a glide inside a syllable, never as a consonant of its own, so ভ or ও is substituted and west becomes bhest.'),
  ('j', 'consonant', 'য়',
   'Voiced palatal approximant. The tongue rises close to the hard palate without contact.',
   null)
on conflict (symbol) do update set
  type                        = excluded.type,
  bangla_equivalent           = excluded.bangla_equivalent,
  articulation_note           = excluded.articulation_note,
  common_bengali_substitution = excluded.common_bengali_substitution,
  updated_at                  = now();

-- ---------------------------------------------------------------------------
-- rule_families — 24 families, each with three examples and two counterexamples
-- ---------------------------------------------------------------------------
-- 002 enforces the shape: exactly three and exactly two. The counterexamples
-- are load-bearing rather than decorative. A learner taught doubling as an
-- absolute writes "opening" as "openning"; the counterexample is the lesson.
insert into public.rule_families (code, statement, examples, counterexamples)
values
  ('doubling_1_1_1',
   'In a one-syllable word ending in one vowel plus one consonant, double the final consonant before a suffix that begins with a vowel.',
   array['stop + ing = stopping', 'big + er = bigger', 'run + ing = running'],
   array['open + ing = opening, because the final syllable is unstressed',
         'box + ing = boxing, because x is never doubled']),

  ('drop_silent_e',
   'Drop a final silent e before a suffix beginning with a vowel, and keep it before a suffix beginning with a consonant.',
   array['hope + ing = hoping', 'use + able = usable', 'care + ful = careful'],
   array['notice + able = noticeable, where the e is kept to hold the c soft',
         'courage + ous = courageous, where the e is kept to hold the g soft']),

  ('y_to_i',
   'When a word ends in a consonant plus y, change the y to i before a suffix.',
   array['happy + er = happier', 'carry + ed = carried', 'beauty + ful = beautiful'],
   array['carry + ing = carrying, because y survives before -ing',
         'play + ed = played, because the y follows a vowel']),

  ('i_before_e',
   'Write i before e when the sound is a long ee, except immediately after c.',
   array['believe', 'field', 'receive'],
   array['seize, which is ei with no c before it',
         'weird, which is ei with no c before it']),

  ('plural_es',
   'Add -es rather than -s when the word ends in a hissing sound written s, x, z, ch or sh.',
   array['box becomes boxes', 'watch becomes watches', 'bus becomes buses'],
   array['stomach becomes stomachs, because ch is pronounced as k',
         'monarch becomes monarchs, for the same reason']),

  ('f_to_ves',
   'Many words ending in f or fe form the plural in -ves.',
   array['leaf becomes leaves', 'knife becomes knives', 'wolf becomes wolves'],
   array['roof becomes roofs', 'chief becomes chiefs']),

  ('silent_letters',
   'In the clusters kn- and wr- at the start of a word, and -mb at the end, one letter is written but not pronounced.',
   array['knee, where the k is silent', 'write, where the w is silent', 'lamb, where the b is silent'],
   array['timber, where the b is pronounced because mb is not word-final',
         'acknowledge, where the k is pronounced because it does not begin the word']),

  ('tion_sion',
   'The noun ending pronounced shun is written -tion, and -sion only after l or n or a stem ending in d, de or se.',
   array['act becomes action', 'educate becomes education', 'create becomes creation'],
   array['ocean, where the shun sound is spelled -cean',
         'musician, where the shun sound is spelled -cian']),

  ('able_ible',
   'Use -able after a stem that is a complete English word, and -ible after a stem that cannot stand alone.',
   array['comfort becomes comfortable', 'read becomes readable', 'vis- becomes visible'],
   array['access becomes accessible, although access is a complete word',
         'digest becomes digestible, although digest is a complete word']),

  ('soft_c',
   'The letter c is pronounced as s before e, i and y, and as k everywhere else.',
   array['city', 'cell', 'cycle'],
   array['ocean, where c before e is pronounced as sh',
         'Celtic, where c before e is pronounced as k']),

  ('soft_g',
   'The letter g is usually pronounced as j before e, i and y, and hard everywhere else.',
   array['gem', 'giant', 'gym'],
   array['get, which is hard before e', 'give, which is hard before i']),

  ('q_takes_u',
   'In English spelling the letter q is followed by u.',
   array['queen', 'quick', 'require'],
   array['qat, a borrowing that keeps its own spelling',
         'niqab, a borrowing that keeps its own spelling']),

  ('ck_after_short_vowel',
   'At the end of a one-syllable word the k sound is written ck after a single short vowel, and k after anything else.',
   array['back', 'sick', 'luck'],
   array['yak, a single short vowel with a plain k',
         'trek, a single short vowel with a plain k']),

  ('tch_after_short_vowel',
   'At the end of a word the ch sound is written tch after a single short vowel.',
   array['catch', 'fetch', 'pitch'],
   array['much', 'rich']),

  ('dge_after_short_vowel',
   'At the end of a word the j sound is written -dge after a single short vowel, and -ge after anything else.',
   array['badge', 'bridge', 'judge'],
   array['college, a short vowel followed by -ge', 'privilege, a short vowel followed by -ge']),

  ('no_final_v',
   'An English word does not end in v; a silent e is written after it.',
   array['have', 'give', 'love'],
   array['rev, a clipped form written as it is said',
         'spiv, a slang word that never took the silent e']),

  ('floss_doubling',
   'At the end of a one-syllable word, f, l, s and z are doubled after a single short vowel.',
   array['stiff', 'ball', 'miss'],
   array['if, a short vowel with a single f', 'bus, a short vowel with a single s']),

  ('prefix_keeps_root',
   'A prefix is added without changing the spelling of the root, so a doubled letter is often the result.',
   array['un + necessary = unnecessary', 'mis + spell = misspell', 'dis + satisfied = dissatisfied'],
   array['in + legal = illegal, where the prefix changes to match the root',
         'in + regular = irregular, where the prefix changes to match the root']),

  ('suffix_ful_one_l',
   'The suffix -ful is written with one l, however the word full is spelled.',
   array['care + ful = careful', 'beauty + ful = beautiful', 'help + ful = helpful'],
   array['full, the free-standing word, which keeps both letters',
         'fullness, which keeps both because full is the root, not the suffix']),

  ('subject_verb_agreement',
   'A verb agrees in number with its subject, not with the noun standing nearest to it.',
   array['The list of items is long.', 'She writes every morning.', 'They write every morning.'],
   array['The team are divided, where a collective subject takes a plural verb',
         'None of the books were missing, where agreement follows the sense']),

  ('article_a_an',
   'Write a before a consonant sound and an before a vowel sound. The sound decides, not the letter.',
   array['an hour, because the h is silent',
         'a university, because the u begins with a y sound',
         'an MP, because the letter name begins with a vowel sound'],
   array['an historic occasion, still written by speakers who weaken the h',
         'an herb, standard in American English, where the h is silent']),

  ('fewer_less',
   'Use many and fewer with what can be counted, and much and less with what cannot.',
   array['many books', 'much water', 'fewer cars'],
   array['less than ten miles, where a measured amount counts as one quantity',
         'one less thing to do, a fixed usage']),

  ('place_prepositions',
   'For place, in encloses, on rests on a surface or a line, and at marks a single point.',
   array['in Bangladesh', 'on Green Road', 'at 14 Green Road'],
   array['on the bus, because a large vehicle takes on',
         'in the car, because a small vehicle takes in']),

  ('ed_pronunciation',
   'The -ed ending is pronounced as t after a voiceless sound, as d after a voiced one, and as id after t or d.',
   array['walked, ending in t', 'played, ending in d', 'wanted, ending in id'],
   array['aged, which is two syllables when it is an adjective',
         'learned, which is two syllables as an adjective and one as a verb'])
on conflict (code) do update set
  statement       = excluded.statement,
  examples        = excluded.examples,
  counterexamples = excluded.counterexamples,
  updated_at      = now();

-- ---------------------------------------------------------------------------
-- The seed asserts its own completeness
-- ---------------------------------------------------------------------------
-- 44 and 24 are quoted throughout the design docs, and Phase 6 turns each
-- phoneme into a scoring dimension. A row lost to a bad merge, a symbol typed
-- with the wrong IPA character, or a vowel filed as a consonant must fail at
-- migrate time, not in Phase 6 when the scorer quietly loses a dimension.
--
-- The check names what must be present rather than counting the whole table.
-- Asserting `count(*) = 44` would be asserting a permanent table-wide invariant,
-- which is a constraint''s job and not a block that runs once; it would also make
-- this migration unre-runnable against any database that holds an extra row.
-- Naming the symbols is the stronger check anyway: it catches a typo, which a
-- count never can.
do $$
declare
  expected_symbols text[] := array[
    -- 12 vowels
    'iː', 'ɪ', 'e', 'æ', 'ɑː', 'ɒ', 'ɔː', 'ʊ', 'uː', 'ʌ', 'ɜː', 'ə',
    -- 8 diphthongs
    'eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'əʊ', 'ɪə', 'eə', 'ʊə',
    -- 24 consonants
    'p', 'b', 't', 'd', 'k', 'ɡ', 'tʃ', 'dʒ', 'f', 'v', 'θ', 'ð',
    's', 'z', 'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ', 'l', 'r', 'w', 'j'
  ];
  expected_codes text[] := array[
    'doubling_1_1_1', 'drop_silent_e', 'y_to_i', 'i_before_e', 'plural_es',
    'f_to_ves', 'silent_letters', 'tion_sion', 'able_ible', 'soft_c', 'soft_g',
    'q_takes_u', 'ck_after_short_vowel', 'tch_after_short_vowel',
    'dge_after_short_vowel', 'no_final_v', 'floss_doubling', 'prefix_keeps_root',
    'suffix_ful_one_l', 'subject_verb_agreement', 'article_a_an', 'fewer_less',
    'place_prepositions', 'ed_pronunciation'
  ];
  missing            text[];
  vowel_count        integer;
  diphthong_count    integer;
  consonant_count    integer;
begin
  if array_length(expected_symbols, 1) <> 44 then
    raise exception 'expected 44 phonemes, the seed lists %', array_length(expected_symbols, 1);
  end if;
  if array_length(expected_codes, 1) <> 24 then
    raise exception 'expected 24 rule families, the seed lists %', array_length(expected_codes, 1);
  end if;

  -- `as expected (symbol)` names the column, not just the table. Aliasing only
  -- the table would leave the bare `symbol` inside the subquery resolving to
  -- `p.symbol`, the condition would read `p.symbol = p.symbol`, and the check
  -- would silently pass for every missing row.
  select array_agg(expected.symbol) into missing
    from unnest(expected_symbols) as expected (symbol)
   where not exists (select 1 from public.phonemes p where p.symbol = expected.symbol);
  if missing is not null then
    raise exception 'phonemes absent after seeding: %', missing;
  end if;

  select array_agg(expected.code) into missing
    from unnest(expected_codes) as expected (code)
   where not exists (select 1 from public.rule_families r where r.code = expected.code);
  if missing is not null then
    raise exception 'rule families absent after seeding: %', missing;
  end if;

  select count(*) filter (where type = 'vowel'),
         count(*) filter (where type = 'diphthong'),
         count(*) filter (where type = 'consonant')
    into vowel_count, diphthong_count, consonant_count
    from public.phonemes
   where symbol = any (expected_symbols);
  if (vowel_count, diphthong_count, consonant_count) <> (12, 8, 24) then
    raise exception 'expected 12 vowels, 8 diphthongs and 24 consonants, found %, % and %',
      vowel_count, diphthong_count, consonant_count;
  end if;
end
$$;
