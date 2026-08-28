import { z } from 'zod';

/**
 * The IELTS vocabulary corpus — a plain word, and the word that earns the band.
 *
 * **What this is, and why it is not the word families.** `content/word-families`
 * answers "what else can this root become" — *analyse → analysis → analytical*,
 * one root spreading across four papers. This answers a different question, the
 * one a candidate actually loses marks on: *I wrote **huge** and the band
 * descriptor wanted **vast***. A family is morphology; this is register. They
 * are separate corpora because a screen that mixed them would be answering two
 * questions with one list, and the learner would not know which one they were
 * reading.
 *
 * **Why this is not another week of the course either.** Nothing here is
 * drilled, marked, or seeded into `words`. The 28-day corpus teaches 3,000
 * words with checked IPA, a Bangla gloss and recorded misspellings, and every
 * one of them is examinable. These pairs are a *reference*: the swap a
 * candidate makes in the exam room, browsable by topic. Folding them into the
 * course would put hundreds of untaught words into the exam distractor pool —
 * the same reason `content/word-families/schema.ts` gives for staying apart.
 *
 * **Why an entry is one string.** `zenith:n = peak, summit` is the whole entry.
 * Written as an object literal per synonym this corpus would be six thousand
 * lines nobody reads, and a misfiled word would be invisible. One line per
 * pair, and a reviewer can scan a hundred of them and see the one that is
 * wrong. The string is parsed and validated here, at load, so nothing outside
 * this directory ever sees a string.
 *
 * **Why there is no Bangla and no IPA.** The same decision the families corpus
 * made, for the same reason. Inventing several hundred Bangla glosses or
 * phonetic transcriptions to fill two columns would put unreviewed claims on a
 * screen whose entire subject is being right about English. Where a word *is*
 * one of the 3,000, the screen marks it `course` and the checked gloss is one
 * click away. Where it is not, the screen speaks it with the browser's own
 * voice and says nothing it cannot stand behind.
 */

/**
 * The topics the corpus is filed under.
 *
 * A closed list, not free text, for the reason the families corpus gives: a
 * corpus where one file says `emotion` and the next says `emotions` renders as
 * two topics with half the words in each, and that failure looks like missing
 * content rather than like a typo.
 *
 * These are not the IELTS task topics — those are `education`, `environment`,
 * `technology`, and they are already how `word-families` is filed. These are
 * *what the word does*: a candidate reaching for a better word is reaching for
 * a better word for an idea (a person's character, a change, a quantity), not
 * for a better word about the environment.
 */
export const VOCABULARY_TOPICS = [
  'character',
  'thought',
  'communication',
  'change',
  'quantity',
  'quality',
  'time',
  'conflict',
  'work',
  'body',
  'place',
  'everyday',
] as const;

export type VocabularyTopic = (typeof VOCABULARY_TOPICS)[number];

/** The four short tags, expanded on the way out. */
export const VOCABULARY_POS_TAGS = {
  n: 'noun',
  v: 'verb',
  adj: 'adjective',
  adv: 'adverb',
} as const;

export type VocabularyPosTag = keyof typeof VOCABULARY_POS_TAGS;
export type VocabularyPos = (typeof VOCABULARY_POS_TAGS)[VocabularyPosTag];

/**
 * `vast`, `well-being`, `play down` — lower case, letters, an internal hyphen,
 * and internal spaces so a phrasal answer can be written as the phrase it is.
 * `to play down` is stored as `play down`: the infinitive marker is English
 * grammar, not part of the word, and half a corpus carrying it would sort
 * several hundred verbs under `t`.
 */
const TERM = /^[a-z]+(?:[- ][a-z]+)*$/u;

/** `zenith:n = peak, summit` — headword, tag, then the equivalents. */
const ENTRY = /^([a-z]+(?:[- ][a-z]+)*):(n|v|adj|adv) = (.+)$/u;

export interface IVocabularyEntry {
  /** The word this entry is filed under — the one the screen prints large. */
  readonly word: string;
  readonly partOfSpeech: VocabularyPos;
  /**
   * What it can be swapped for, best first.
   *
   * Ordered rather than a set. The first is the one the drill marks correct and
   * the one the card prints beside the headword; the rest are there for a
   * learner reading the card, who benefits from seeing that a word rarely has
   * exactly one equivalent.
   */
  readonly synonyms: readonly string[];
  readonly topic: VocabularyTopic;
}

/** One topic file, as written. */
export interface IRawVocabularyGroup {
  readonly topic: VocabularyTopic;
  readonly entries: readonly string[];
}

export const rawVocabularyGroupSchema = z.object({
  topic: z.enum(VOCABULARY_TOPICS),
  entries: z.array(z.string().min(1)).min(1),
});

export interface IParseFailure {
  readonly path: string;
  readonly message: string;
}

/**
 * Parses one line into an entry, or reports why it cannot be.
 *
 * The checks that matter are the ones a careless edit slips past: a synonym
 * that *is* the headword (which renders as a card teaching that `vast` means
 * `vast`), a synonym listed twice, and a line with nothing after the `=`. None
 * of these throw — the caller collects every issue across the corpus so one run
 * names every problem rather than the first one.
 */
export function parseVocabularyEntry(
  line: string,
  topic: VocabularyTopic,
): { readonly entry: IVocabularyEntry | null; readonly issues: readonly IParseFailure[] } {
  const matched = ENTRY.exec(line);

  if (matched === null) {
    return {
      entry: null,
      issues: [{ path: line, message: `is not a "word:pos = synonym, synonym" line` }],
    };
  }

  const [, word = '', tag = 'n', rest = ''] = matched;
  const issues: IParseFailure[] = [];
  const synonyms: string[] = [];
  const seen = new Set<string>();

  for (const raw of rest.split(',')) {
    const synonym = raw.trim();

    if (synonym === '') {
      continue;
    }

    if (!TERM.test(synonym)) {
      issues.push({ path: word, message: `"${synonym}" is not a lower-case English term` });
      continue;
    }

    if (synonym === word) {
      issues.push({ path: word, message: `"${synonym}" is the headword, not a synonym for it` });
      continue;
    }

    if (seen.has(synonym)) {
      issues.push({ path: word, message: `"${synonym}" is listed twice` });
      continue;
    }

    seen.add(synonym);
    synonyms.push(synonym);
  }

  if (synonyms.length === 0) {
    issues.push({ path: word, message: 'an entry needs at least one synonym' });
  }

  if (issues.length > 0) {
    return { entry: null, issues };
  }

  return {
    entry: {
      word,
      partOfSpeech: VOCABULARY_POS_TAGS[tag as VocabularyPosTag],
      synonyms,
      topic,
    },
    issues: [],
  };
}
