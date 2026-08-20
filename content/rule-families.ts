import { type RuleFamilyEntry } from './schema';

/**
 * The 24 rule families, each with a statement, three examples and two
 * counterexamples.
 *
 * **Not invented here**, for the same reason as `phonemes.ts`: migration
 * `010_seed_reference` already carries them, written and reviewed in Phase 2,
 * and two sources for the same 24 rows drift. Parsed out of the SQL rather than
 * retyped.
 *
 * The **counterexamples are the half that matters**. A rule with no exception
 * teaches a false absolute, and English spelling is very largely made of
 * exceptions — `noticeable` keeps its silent e to hold the c soft, `boxing`
 * does not double because x is never doubled. 002 refuses a family without
 * exactly three and exactly two, and so does the schema here, because a family
 * that lost its counterexamples would still render and would teach a rule the
 * language does not follow.
 *
 * The codes are snake case because that is what `rule_families.code` is unique
 * on. Renaming them here would orphan every `mastery_records` row keyed on the
 * old value — the rule-family axis of the matrix, erased by a tidy-up.
 */
export const RULE_FAMILIES: readonly RuleFamilyEntry[] = [
  {
    code: 'doubling_1_1_1',
    statement:
      'In a one-syllable word ending in one vowel plus one consonant, double the final consonant before a suffix that begins with a vowel.',
    examples: [
      'stop + ing = stopping',
      'big + er = bigger',
      'run + ing = running',
    ],
    counterexamples: [
      'open + ing = opening, because the final syllable is unstressed',
      'box + ing = boxing, because x is never doubled',
    ],
  },
  {
    code: 'drop_silent_e',
    statement:
      'Drop a final silent e before a suffix beginning with a vowel, and keep it before a suffix beginning with a consonant.',
    examples: [
      'hope + ing = hoping',
      'use + able = usable',
      'care + ful = careful',
    ],
    counterexamples: [
      'notice + able = noticeable, where the e is kept to hold the c soft',
      'courage + ous = courageous, where the e is kept to hold the g soft',
    ],
  },
  {
    code: 'y_to_i',
    statement:
      'When a word ends in a consonant plus y, change the y to i before a suffix.',
    examples: [
      'happy + er = happier',
      'carry + ed = carried',
      'beauty + ful = beautiful',
    ],
    counterexamples: [
      'carry + ing = carrying, because y survives before -ing',
      'play + ed = played, because the y follows a vowel',
    ],
  },
  {
    code: 'i_before_e',
    statement:
      'Write i before e when the sound is a long ee, except immediately after c.',
    examples: [
      'believe',
      'field',
      'receive',
    ],
    counterexamples: [
      'seize, which is ei with no c before it',
      'weird, which is ei with no c before it',
    ],
  },
  {
    code: 'plural_es',
    statement:
      'Add -es rather than -s when the word ends in a hissing sound written s, x, z, ch or sh.',
    examples: [
      'box becomes boxes',
      'watch becomes watches',
      'bus becomes buses',
    ],
    counterexamples: [
      'stomach becomes stomachs, because ch is pronounced as k',
      'monarch becomes monarchs, for the same reason',
    ],
  },
  {
    code: 'f_to_ves',
    statement:
      'Many words ending in f or fe form the plural in -ves.',
    examples: [
      'leaf becomes leaves',
      'knife becomes knives',
      'wolf becomes wolves',
    ],
    counterexamples: [
      'roof becomes roofs',
      'chief becomes chiefs',
    ],
  },
  {
    code: 'silent_letters',
    statement:
      'In the clusters kn- and wr- at the start of a word, and -mb at the end, one letter is written but not pronounced.',
    examples: [
      'knee, where the k is silent',
      'write, where the w is silent',
      'lamb, where the b is silent',
    ],
    counterexamples: [
      'timber, where the b is pronounced because mb is not word-final',
      'acknowledge, where the k is pronounced because it does not begin the word',
    ],
  },
  {
    code: 'tion_sion',
    statement:
      'The noun ending pronounced shun is written -tion, and -sion only after l or n or a stem ending in d, de or se.',
    examples: [
      'act becomes action',
      'educate becomes education',
      'create becomes creation',
    ],
    counterexamples: [
      'ocean, where the shun sound is spelled -cean',
      'musician, where the shun sound is spelled -cian',
    ],
  },
  {
    code: 'able_ible',
    statement:
      'Use -able after a stem that is a complete English word, and -ible after a stem that cannot stand alone.',
    examples: [
      'comfort becomes comfortable',
      'read becomes readable',
      'vis- becomes visible',
    ],
    counterexamples: [
      'access becomes accessible, although access is a complete word',
      'digest becomes digestible, although digest is a complete word',
    ],
  },
  {
    code: 'soft_c',
    statement:
      'The letter c is pronounced as s before e, i and y, and as k everywhere else.',
    examples: [
      'city',
      'cell',
      'cycle',
    ],
    counterexamples: [
      'ocean, where c before e is pronounced as sh',
      'Celtic, where c before e is pronounced as k',
    ],
  },
  {
    code: 'soft_g',
    statement:
      'The letter g is usually pronounced as j before e, i and y, and hard everywhere else.',
    examples: [
      'gem',
      'giant',
      'gym',
    ],
    counterexamples: [
      'get, which is hard before e',
      'give, which is hard before i',
    ],
  },
  {
    code: 'q_takes_u',
    statement:
      'In English spelling the letter q is followed by u.',
    examples: [
      'queen',
      'quick',
      'require',
    ],
    counterexamples: [
      'qat, a borrowing that keeps its own spelling',
      'niqab, a borrowing that keeps its own spelling',
    ],
  },
  {
    code: 'ck_after_short_vowel',
    statement:
      'At the end of a one-syllable word the k sound is written ck after a single short vowel, and k after anything else.',
    examples: [
      'back',
      'sick',
      'luck',
    ],
    counterexamples: [
      'yak, a single short vowel with a plain k',
      'trek, a single short vowel with a plain k',
    ],
  },
  {
    code: 'tch_after_short_vowel',
    statement:
      'At the end of a word the ch sound is written tch after a single short vowel.',
    examples: [
      'catch',
      'fetch',
      'pitch',
    ],
    counterexamples: [
      'much',
      'rich',
    ],
  },
  {
    code: 'dge_after_short_vowel',
    statement:
      'At the end of a word the j sound is written -dge after a single short vowel, and -ge after anything else.',
    examples: [
      'badge',
      'bridge',
      'judge',
    ],
    counterexamples: [
      'college, a short vowel followed by -ge',
      'privilege, a short vowel followed by -ge',
    ],
  },
  {
    code: 'no_final_v',
    statement:
      'An English word does not end in v; a silent e is written after it.',
    examples: [
      'have',
      'give',
      'love',
    ],
    counterexamples: [
      'rev, a clipped form written as it is said',
      'spiv, a slang word that never took the silent e',
    ],
  },
  {
    code: 'floss_doubling',
    statement:
      'At the end of a one-syllable word, f, l, s and z are doubled after a single short vowel.',
    examples: [
      'stiff',
      'ball',
      'miss',
    ],
    counterexamples: [
      'if, a short vowel with a single f',
      'bus, a short vowel with a single s',
    ],
  },
  {
    code: 'prefix_keeps_root',
    statement:
      'A prefix is added without changing the spelling of the root, so a doubled letter is often the result.',
    examples: [
      'un + necessary = unnecessary',
      'mis + spell = misspell',
      'dis + satisfied = dissatisfied',
    ],
    counterexamples: [
      'in + legal = illegal, where the prefix changes to match the root',
      'in + regular = irregular, where the prefix changes to match the root',
    ],
  },
  {
    code: 'suffix_ful_one_l',
    statement:
      'The suffix -ful is written with one l, however the word full is spelled.',
    examples: [
      'care + ful = careful',
      'beauty + ful = beautiful',
      'help + ful = helpful',
    ],
    counterexamples: [
      'full, the free-standing word, which keeps both letters',
      'fullness, which keeps both because full is the root, not the suffix',
    ],
  },
  {
    code: 'subject_verb_agreement',
    statement:
      'A verb agrees in number with its subject, not with the noun standing nearest to it.',
    examples: [
      'The list of items is long.',
      'She writes every morning.',
      'They write every morning.',
    ],
    counterexamples: [
      'The team are divided, where a collective subject takes a plural verb',
      'None of the books were missing, where agreement follows the sense',
    ],
  },
  {
    code: 'article_a_an',
    statement:
      'Write a before a consonant sound and an before a vowel sound. The sound decides, not the letter.',
    examples: [
      'an hour, because the h is silent',
      'a university, because the u begins with a y sound',
      'an MP, because the letter name begins with a vowel sound',
    ],
    counterexamples: [
      'an historic occasion, still written by speakers who weaken the h',
      'an herb, standard in American English, where the h is silent',
    ],
  },
  {
    code: 'fewer_less',
    statement:
      'Use many and fewer with what can be counted, and much and less with what cannot.',
    examples: [
      'many books',
      'much water',
      'fewer cars',
    ],
    counterexamples: [
      'less than ten miles, where a measured amount counts as one quantity',
      'one less thing to do, a fixed usage',
    ],
  },
  {
    code: 'place_prepositions',
    statement:
      'For place, in encloses, on rests on a surface or a line, and at marks a single point.',
    examples: [
      'in Bangladesh',
      'on Green Road',
      'at 14 Green Road',
    ],
    counterexamples: [
      'on the bus, because a large vehicle takes on',
      'in the car, because a small vehicle takes in',
    ],
  },
  {
    code: 'ed_pronunciation',
    statement:
      'The -ed ending is pronounced as t after a voiceless sound, as d after a voiced one, and as id after t or d.',
    examples: [
      'walked, ending in t',
      'played, ending in d',
      'wanted, ending in id',
    ],
    counterexamples: [
      'aged, which is two syllables when it is an adjective',
      'learned, which is two syllables as an adjective and one as a verb',
    ],
  },
];
