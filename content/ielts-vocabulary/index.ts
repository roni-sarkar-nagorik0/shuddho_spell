import { VOCAB_BODY } from './vocab-body';
import { VOCAB_CHANGE } from './vocab-change';
import { VOCAB_CHARACTER } from './vocab-character';
import { VOCAB_COMMUNICATION } from './vocab-communication';
import { VOCAB_CONFLICT } from './vocab-conflict';
import { VOCAB_EVERYDAY } from './vocab-everyday';
import { VOCAB_PLACE } from './vocab-place';
import { VOCAB_QUALITY } from './vocab-quality';
import { VOCAB_QUANTITY } from './vocab-quantity';
import { VOCAB_THOUGHT } from './vocab-thought';
import { VOCAB_TIME } from './vocab-time';
import { VOCAB_WORK } from './vocab-work';
import {
  parseVocabularyEntry,
  rawVocabularyGroupSchema,
  type IRawVocabularyGroup,
  type IVocabularyEntry,
} from './schema';

/**
 * The IELTS vocabulary corpus, assembled and parsed once.
 *
 * Validated at module load exactly as the 28-day corpus and the word families
 * are: `pnpm content:validate` runs in `prebuild`, so a malformed line, a
 * headword that repeats, or a corpus that has quietly shrunk below the size the
 * product claims fails the build rather than rendering as a slightly wrong
 * screen.
 */
const GROUPS: readonly IRawVocabularyGroup[] = [
  VOCAB_CHARACTER,
  VOCAB_THOUGHT,
  VOCAB_COMMUNICATION,
  VOCAB_CHANGE,
  VOCAB_QUANTITY,
  VOCAB_QUALITY,
  VOCAB_TIME,
  VOCAB_CONFLICT,
  VOCAB_WORK,
  VOCAB_BODY,
  VOCAB_PLACE,
  VOCAB_EVERYDAY,
];

/**
 * The floor this corpus promises.
 *
 * Asserted rather than described, for the reason `word-families/index.ts`
 * gives: the size is a claim the product prints on a screen a learner reads,
 * and a corpus that fell to 600 after a de-duplication would leave the claim
 * standing and untrue with nothing else in the build noticing.
 */
export const VOCABULARY_MINIMUM_ENTRIES = 700;

export interface IVocabularyIssue {
  readonly file: string;
  readonly path: string;
  readonly message: string;
}

export interface IVocabularyCounts {
  readonly entries: number;
  readonly synonyms: number;
  readonly topics: number;
}

export interface IVocabularyValidation {
  readonly issues: readonly IVocabularyIssue[];
  readonly counts: IVocabularyCounts;
}

function fileFor(topic: string): string {
  return `content/ielts-vocabulary/vocab-${topic}.ts`;
}

/**
 * Parses every group, collecting issues rather than throwing on the first.
 *
 * The cross-file check is the one a per-line parser cannot make: a headword
 * that appears in two topics renders as two cards claiming to be the same word,
 * and whichever the learner reads second contradicts the first. The corpus is
 * one word, one home — a word with two genuinely distinct senses gets the
 * sense that earns marks, not both.
 */
function read(): {
  readonly entries: readonly IVocabularyEntry[];
  readonly issues: readonly IVocabularyIssue[];
} {
  const entries: IVocabularyEntry[] = [];
  const issues: IVocabularyIssue[] = [];
  const owner = new Map<string, string>();

  for (const group of GROUPS) {
    const file = fileFor(group.topic);
    const shape = rawVocabularyGroupSchema.safeParse(group);

    if (!shape.success) {
      for (const issue of shape.error.issues) {
        issues.push({ file, path: issue.path.join('.'), message: issue.message });
      }
      continue;
    }

    for (const line of group.entries) {
      const { entry, issues: failures } = parseVocabularyEntry(line, group.topic);

      for (const failure of failures) {
        issues.push({ file, path: failure.path, message: failure.message });
      }

      if (entry === null) {
        continue;
      }

      const existing = owner.get(entry.word);

      if (existing !== undefined) {
        issues.push({
          file,
          path: entry.word,
          message: `already filed under "${existing}" — a word has one home`,
        });
        continue;
      }

      owner.set(entry.word, group.topic);
      entries.push(entry);
    }
  }

  return { entries, issues };
}

const parsed = read();

/** The corpus, parsed and frozen. */
export const IELTS_VOCABULARY: readonly IVocabularyEntry[] = Object.freeze(parsed.entries);

/**
 * The corpus and its issues, for `pnpm content:validate`.
 *
 * The size floor is checked here rather than in the parser because it is a
 * property of the whole corpus, and the parser only ever sees one line.
 */
export function validateVocabulary(): IVocabularyValidation {
  const issues = [...parsed.issues];

  if (parsed.entries.length < VOCABULARY_MINIMUM_ENTRIES) {
    issues.push({
      file: 'content/ielts-vocabulary/index.ts',
      path: 'VOCABULARY_MINIMUM_ENTRIES',
      message: `the corpus promises at least ${String(VOCABULARY_MINIMUM_ENTRIES)} entries and holds ${String(parsed.entries.length)}`,
    });
  }

  return {
    issues,
    counts: {
      entries: parsed.entries.length,
      synonyms: new Set(parsed.entries.flatMap((entry) => entry.synonyms)).size,
      topics: new Set(parsed.entries.map((entry) => entry.topic)).size,
    },
  };
}

export { type IVocabularyEntry } from './schema';
