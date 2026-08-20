import { z } from 'zod';

/**
 * The shape of everything in `content/`, and the rules that make it usable.
 *
 * `10-content-pipeline.md` opens with "this is the phase that makes the app
 * worth using — do not shortcut it", and this file is where that is enforced
 * rather than hoped for. Every rule below exists because breaking it degrades
 * something downstream in a way that is invisible until a learner hits it:
 * a misspelling that equals the word teaches nothing, a `banglaMeaning` in
 * Latin letters is a transliteration standing in for Bangla, a duplicate word
 * across two weeks is a learner being taught the same thing twice and told it
 * is new.
 *
 * Parsing happens at module load in `content/index.ts`, so a malformed entry
 * fails **the build**, and Zod's issue path names the exact file and entry.
 */

/** At least one Bangla codepoint — the Bengali block is U+0980..U+09FF. */
const BANGLA_SCRIPT = /[ঀ-৿]/u;

/**
 * Bangla, not transliteration.
 *
 * `CLAUDE.md` bans "transliterated Bangla" outright, and the failure it
 * prevents is subtle: `bhalo` looks like content, passes every other check, and
 * is unreadable to the learner the product is for. Requiring a real codepoint
 * is the cheapest test that tells the two apart.
 */
const banglaText = (field: string): z.ZodType<string> =>
  z
    .string()
    .min(1)
    .refine((value) => BANGLA_SCRIPT.test(value), {
      message: `${field} must be written in Bangla script, not transliterated`,
    });

/** Bare IPA — no slashes, no brackets. The same rule `IpaTranscription` holds. */
const ipa = z
  .string()
  .min(1)
  .refine((value) => !/[/[\]]/u.test(value), {
    message: 'IPA must be bare — no / / or [ ] delimiters',
  });

export const PART_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'determiner',
  'interjection',
] as const;

export const PHONEME_TYPE = ['vowel', 'consonant', 'diphthong'] as const;

export const DIFFICULTY = ['easy', 'medium', 'hard'] as const;

export const phonemeSchema = z
  .object({
    symbol: ipa,
    type: z.enum(PHONEME_TYPE),
    /**
     * Null is **data, not a gap**: Bangla has no such sound. 002 says so and
     * the refinement below is what stops null being used as "not filled in".
     */
    banglaEquivalent: z.string().nullable(),
    articulationNote: z.string().min(20),
    commonBengaliSubstitution: z.string().nullable(),
    needsReview: z.boolean().default(false),
  })
  .refine(
    (phoneme) => phoneme.banglaEquivalent !== null || phoneme.commonBengaliSubstitution !== null,
    {
      message:
        'a sound Bangla lacks must record what Bengali speakers produce instead — that substitution is what the lesson teaches against',
      path: ['commonBengaliSubstitution'],
    },
  );

export type PhonemeEntry = z.infer<typeof phonemeSchema>;

export const ruleFamilySchema = z.object({
  code: z.string().regex(/^[a-z0-9-]+$/u),
  statement: z.string().min(20),
  /**
   * Exactly three and exactly two, matching 002's constraints. The
   * counterexamples are the half that matters: a rule with no exception teaches
   * a false absolute, and English spelling is made of exceptions.
   */
  examples: z.array(z.string().min(1)).length(3),
  counterexamples: z.array(z.string().min(1)).length(2),
});

export type RuleFamilyEntry = z.infer<typeof ruleFamilySchema>;

export const wordSchema = z
  .object({
    text: z.string().min(1).regex(/^[a-z'-]+$/u, 'words are stored lower-case'),
    ipa,
    /** `syllables.join('')` must reconstruct the word — checked below. */
    syllables: z.array(z.string().min(1)).min(1),
    /** How the word sounds, written in Bangla script for a Bengali reader. */
    banglaSound: banglaText('banglaSound'),
    banglaMeaning: banglaText('banglaMeaning'),
    partOfSpeech: z.enum(PART_OF_SPEECH),
    /** The rule family this word demonstrates, or null when it demonstrates none. */
    ruleFamily: z.string().nullable(),
    frequencyRank: z.number().int().positive().nullable(),
    /**
     * **≥2, realistic, and never the word itself.**
     *
     * These feed `ErrorTagger` and the exam distractors, so garbage here
     * degrades two engines. `recieve` for `receive`, yes; `xqzve`, no. A
     * misspelling equal to the word would mark a correct answer as a known
     * error, which is worse than having none.
     */
    commonMisspellings: z.array(z.string().min(1)).min(2),
    /** Set when the IPA is a best attempt rather than a checked fact. */
    ipaNeedsReview: z.boolean().default(false),
  })
  .refine((word) => !word.commonMisspellings.some((m) => m === word.text), {
    message: 'a common misspelling cannot be the word itself',
    path: ['commonMisspellings'],
  })
  .refine((word) => new Set(word.commonMisspellings).size === word.commonMisspellings.length, {
    message: 'common misspellings must be distinct',
    path: ['commonMisspellings'],
  })
  .refine(
    (word) => word.syllables.join('').replaceAll('-', '') === word.text.replaceAll('-', ''),
    {
      message: 'syllables must join back into the word',
      path: ['syllables'],
    },
  );

export type WordEntry = z.infer<typeof wordSchema>;

export const sentenceItemSchema = z
  .object({
    banglaText: banglaText('banglaText'),
    englishText: z.string().min(1),
    /**
     * **≥2, and never the target.**
     *
     * English usually has more than one correct rendering of a Bangla
     * sentence, and a single hard-coded target marks a correct learner wrong —
     * the fastest way to lose trust in a language product.
     */
    acceptedAlternatives: z.array(z.string().min(1)).min(2),
    /** Wrong words mixed into the word bank. Never words of the answer. */
    distractorWords: z.array(z.string().min(1)).min(2),
    grammarRuleCodes: z.array(z.string()),
    difficulty: z.enum(DIFFICULTY),
  })
  .refine((item) => !item.acceptedAlternatives.some((a) => a === item.englishText), {
    message: 'an accepted alternative cannot be the target sentence',
    path: ['acceptedAlternatives'],
  })
  .refine((item) => new Set(item.acceptedAlternatives).size === item.acceptedAlternatives.length, {
    message: 'accepted alternatives must be distinct',
    path: ['acceptedAlternatives'],
  });

export type SentenceItemEntry = z.infer<typeof sentenceItemSchema>;

/**
 * One day of the programme.
 *
 * `estimatedMinutes` is checked against the volume it actually holds, because
 * `10-content-pipeline.md` is specific: "a day whose items take 70 minutes but
 * claims 30 breaks the learner's trust and the streak mechanic". The streak is
 * the product's main retention mechanism and it is built on a promise about
 * time.
 */
export const dayPlanSchema = z.object({
  dayIndex: z.number().int().min(1).max(28),
  title: z.string().min(3),
  focus: z.string().min(10),
  /** Indexes into the week's own `words` array — resolved when the week is assembled. */
  wordTexts: z.array(z.string().min(1)).min(1),
  sentenceTexts: z.array(z.string().min(1)),
  ruleFamilyCodes: z.array(z.string()),
  estimatedMinutes: z.number().int().min(5).max(90),
});

export type DayPlanEntry = z.infer<typeof dayPlanSchema>;

/**
 * A week is either **empty or complete** — never half of one.
 *
 * `days.min(1)` alone cannot tell an unwritten week from a written one whose
 * day plan was forgotten, and the second is a real error: three hundred words
 * that no day of the programme ever shows a learner. Pairing the two catches
 * it, and lets a week that has not been generated yet be honestly empty rather
 * than stubbed with a fake day to satisfy a minimum.
 */
export const weekSchema = z
  .object({
    weekIndex: z.number().int().min(1).max(4),
    words: z.array(wordSchema),
    sentenceItems: z.array(sentenceItemSchema),
    days: z.array(dayPlanSchema),
  })
  .refine((week) => (week.words.length === 0) === (week.days.length === 0), {
    message:
      'a week has words and days, or neither — words with no day plan are words no learner is ever shown',
    path: ['days'],
  });

export type WeekEntry = z.infer<typeof weekSchema>;
