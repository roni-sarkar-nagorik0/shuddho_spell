import { z } from 'zod';

/**
 * The IELTS word-family corpus — one root, the words built from it, and the
 * spelling rule that connects them.
 *
 * **Why this is a separate directory and not another week.** `content/week-*`
 * is the 28-day programme: every word there is taught, drilled, examined and
 * seeded into `words`. Nothing here is. These families are a *reference* — a
 * library screen a learner browses when they want to see how one root spreads
 * across the four IELTS papers — and folding them into the corpus would put
 * 1,800 untaught words into the exam distractor pool and the daily dictation
 * queue. Two bodies of content with two jobs, kept apart at the directory
 * level so no import can quietly mix them.
 *
 * **Why the forms are one string.** A family averages five or six members, and
 * an object literal per member would make this corpus 11,000 lines that nobody
 * would ever read end to end. Written as `analysed:v analysing:v analysis:n`
 * a family fits on one line, a reviewer can scan a hundred of them, and a
 * misfiled word is visible rather than buried. The string is parsed and
 * validated here, at load, so the terseness costs nothing downstream — by the
 * time anything outside this directory sees a family it is a typed object.
 *
 * **Why there is no IPA.** The 1,240 programme words carry checked IPA because
 * a lesson marks pronunciation against it. These 1,800 do not, and inventing
 * 1,800 phonetic transcriptions to fill a column would put unverified claims on
 * the one screen whose entire subject is being right about English. The screen
 * speaks a word with the browser's own voice and links to the library row when
 * the word is one of the 1,240 — where the IPA *has* been checked.
 */

/** At least one Bangla codepoint — the Bengali block is U+0980..U+09FF. */
const BANGLA_SCRIPT = /[ঀ-৿]/u;

/**
 * The four IELTS papers, as single letters.
 *
 * Written `SWLR` rather than as an array of four words for the same reason the
 * forms are a string: it keeps a family on one line. The letters are expanded
 * into `IeltsSkill` values at parse time, so nothing downstream deals in
 * letters.
 */
export const SKILL_LETTERS = { S: 'speaking', W: 'writing', L: 'listening', R: 'reading' } as const;

export type SkillLetter = keyof typeof SKILL_LETTERS;
export type WordFamilySkill = (typeof SKILL_LETTERS)[SkillLetter];

/** The four short tags, expanded on the way out. Adjectives and adverbs earn their own. */
export const POS_TAGS = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' } as const;

export type PosTag = keyof typeof POS_TAGS;
export type WordFamilyPos = (typeof POS_TAGS)[PosTag];

/**
 * The topics an IELTS candidate is actually asked about.
 *
 * A closed list, not free text. Topic is the primary way this screen is
 * browsed, and a corpus where one family says `environment` and the next says
 * `the environment` renders as two topics with half the words in each — a
 * failure that looks like missing content rather than like a typo.
 */
export const WORD_FAMILY_TOPICS = [
  'education',
  'science',
  'language',
  'environment',
  'energy',
  'agriculture',
  'work',
  'economy',
  'money',
  'society',
  'law',
  'government',
  'culture',
  'media',
  'health',
  'food',
  'sport',
  'family',
  'emotion',
  'technology',
  'travel',
  'city',
  'communication',
  'measurement',
  'change',
  'argument',
] as const;

export type WordFamilyTopic = (typeof WORD_FAMILY_TOPICS)[number];

/** `walk`, `well-being` — lower case, letters and an internal hyphen. */
const FORM_TEXT = /^[a-z]+(?:-[a-z]+)*$/u;

/** One member of a family, before parsing: `analysing:v`. */
const MEMBER = /^([a-z]+(?:-[a-z]+)*):(n|v|adj|adv)$/u;

/** The fewest members a family may have before it stops being a family. */
const SMALLEST_FAMILY = 2;

export interface IWordFamilyMember {
  readonly text: string;
  readonly partOfSpeech: WordFamilyPos;
}

export interface IWordFamily {
  readonly root: string;
  readonly banglaMeaning: string;
  /** A `rule_families.code`, or null when the family demonstrates no single rule. */
  readonly ruleFamily: string | null;
  readonly skills: readonly WordFamilySkill[];
  readonly topic: WordFamilyTopic;
  readonly members: readonly IWordFamilyMember[];
}

/**
 * The raw entry, as written in the content files.
 *
 * `rule` is `string | null` rather than an enum of the 24 codes because the
 * codes live in `content/rule-families.ts` and a second copy of them here would
 * be the drift this project keeps refusing. The cross-check against the real
 * list is in `index.ts`, where both are in scope.
 */
export const rawWordFamilySchema = z.object({
  root: z.string().regex(FORM_TEXT, 'a root is lower case letters, optionally hyphenated'),
  bangla: z
    .string()
    .min(1)
    .refine((value) => BANGLA_SCRIPT.test(value), {
      message: 'bangla must be written in Bangla script, not transliterated',
    }),
  rule: z.string().regex(/^[a-z0-9_]+$/u).nullable(),
  skills: z
    .string()
    .regex(/^[SWLR]+$/u, 'skills are drawn from S, W, L and R')
    .refine((value) => new Set(value).size === value.length, {
      message: 'a paper may not be listed twice',
    }),
  topic: z.enum(WORD_FAMILY_TOPICS),
  forms: z.string().min(1),
});

export type RawWordFamily = z.infer<typeof rawWordFamilySchema>;

export interface IParseFailure {
  readonly path: string;
  readonly message: string;
}

/**
 * Parses one raw entry into a family, or reports why it cannot be.
 *
 * The checks that matter are the ones a careless edit would otherwise slip
 * past: a member repeated inside its own family, a member that *is* the root
 * (which would render the root twice and teach that a word derives from
 * itself), and a family of one. None of these throw — the caller collects every
 * issue across the corpus so one run names every problem rather than the first.
 */
export function parseWordFamily(raw: RawWordFamily): {
  readonly family: IWordFamily | null;
  readonly issues: readonly IParseFailure[];
} {
  const issues: IParseFailure[] = [];
  const members: IWordFamilyMember[] = [];
  const seen = new Set<string>();

  for (const token of raw.forms.split(' ').filter((part) => part !== '')) {
    const matched = MEMBER.exec(token);

    if (matched === null) {
      issues.push({ path: 'forms', message: `"${token}" is not a word:pos pair` });
      continue;
    }

    const [, text = '', tag = 'n'] = matched;

    if (text === raw.root) {
      issues.push({ path: 'forms', message: `"${text}" is the root, not a form of it` });
      continue;
    }

    if (seen.has(text)) {
      issues.push({ path: 'forms', message: `"${text}" is listed twice` });
      continue;
    }

    seen.add(text);
    members.push({ text, partOfSpeech: POS_TAGS[tag as PosTag] });
  }

  if (members.length < SMALLEST_FAMILY) {
    issues.push({
      path: 'forms',
      message: `a family needs at least ${String(SMALLEST_FAMILY)} forms beside the root`,
    });
  }

  if (issues.length > 0) {
    return { family: null, issues };
  }

  return {
    family: {
      root: raw.root,
      banglaMeaning: raw.bangla,
      ruleFamily: raw.rule,
      skills: Array.from(raw.skills).map((letter) => SKILL_LETTERS[letter as SkillLetter]),
      topic: raw.topic,
      members,
    },
    issues: [],
  };
}
