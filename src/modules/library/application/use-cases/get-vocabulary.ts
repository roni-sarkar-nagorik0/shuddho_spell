import { type ICourseWordIndex } from '../../domain/repositories/course-word-index';
import { type IVocabularySource } from '../../domain/repositories/vocabulary-source';
import { type VocabularyEntry } from '../../domain/entities/vocabulary-entry';
import {
  type IVocabularyEntryView,
  type IVocabularyPage,
  type IVocabularyPosTally,
  type IVocabularyTopicTally,
} from '../dto/vocabulary-view';

export interface IGetVocabularyInput {
  readonly topic?: string;
  readonly partOfSpeech?: string;
  /** The beginning of a word the learner is looking for, headword or synonym. */
  readonly startsWith?: string;
  /** The headword of the last entry on the previous page. */
  readonly after?: string;
  readonly pageSize: number;
}

/** A ceiling on what one request may ask for, whatever the query string says. */
const MAX_PAGE_SIZE = 100;

/**
 * A page of the IELTS vocabulary pairs.
 *
 * **The tallies are over the whole corpus, and the match count is not.** Both
 * numbers are on the screen at once and they answer different questions — "how
 * much of this is in here" and "how much of it matches what I asked for". The
 * topic index in particular is navigation, a list of doors, and a door that
 * vanishes because the current filter excluded it is a door the learner cannot
 * find their way back through. That is the same reasoning `GetWordFamilies`
 * gives, and it is the same screen shape.
 *
 * **The order is the corpus's own order, not alphabetical.** Each topic file is
 * written with its commonest, highest-value swaps first, and sorting the corpus
 * would throw that editorial judgement away in favour of the accident of
 * spelling. Paging is a keyset over that order, so a page boundary is stable
 * even though the order is not alphabetical.
 *
 * No query at all: the corpus is a compiled module and the course index is a
 * set built at construction, so this use case never leaves the process.
 */
export class GetVocabularyUseCase {
  constructor(
    private readonly vocabulary: IVocabularySource,
    private readonly courseWords: ICourseWordIndex,
  ) {}

  async execute(input: IGetVocabularyInput): Promise<IVocabularyPage> {
    const all = this.vocabulary.listAll();
    const matched = all.filter((entry) => keeps(entry, input));

    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize));
    const start =
      input.after === undefined
        ? 0
        : matched.findIndex((entry) => entry.word === input.after) + 1;
    const page = matched.slice(start, start + pageSize);

    return Promise.resolve({
      entries: page.map((entry) => this.view(entry)),
      nextCursor:
        start + pageSize < matched.length ? (page[page.length - 1]?.word ?? null) : null,
      matchedEntries: matched.length,
      totalEntries: all.length,
      totalSynonyms: countSynonyms(all),
      topics: byTopic(all),
      partsOfSpeech: byPartOfSpeech(all),
    });
  }

  private view(entry: VocabularyEntry): IVocabularyEntryView {
    return {
      word: entry.word,
      partOfSpeech: entry.partOfSpeech,
      topic: entry.topic,
      synonyms: entry.synonyms,
      inCourse: this.courseWords.has(entry.word),
      isPhrase: entry.isPhrase,
    };
  }
}

function keeps(entry: VocabularyEntry, input: IGetVocabularyInput): boolean {
  if (input.topic !== undefined && entry.topic !== input.topic) {
    return false;
  }

  if (input.partOfSpeech !== undefined && entry.partOfSpeech !== input.partOfSpeech) {
    return false;
  }

  return input.startsWith === undefined || entry.matches(input.startsWith);
}

/**
 * Distinct synonyms across a set of entries.
 *
 * A set, not a sum of lengths. `reduce` and `lessen` are both offered for more
 * than one headword, and this figure is printed on the screen as the size of
 * the product — a claim that big is counted rather than inferred.
 */
function countSynonyms(entries: readonly VocabularyEntry[]): number {
  const seen = new Set<string>();

  for (const entry of entries) {
    for (const synonym of entry.synonyms) {
      seen.add(synonym);
    }
  }

  return seen.size;
}

function byTopic(entries: readonly VocabularyEntry[]): readonly IVocabularyTopicTally[] {
  return tally(entries, (entry) => entry.topic).map(([topic, count]) => ({
    topic,
    entries: count,
  }));
}

function byPartOfSpeech(entries: readonly VocabularyEntry[]): readonly IVocabularyPosTally[] {
  return tally(entries, (entry) => entry.partOfSpeech).map(([partOfSpeech, count]) => ({
    partOfSpeech,
    entries: count,
  }));
}

/** Counts by a key, commonest first. */
function tally(
  entries: readonly VocabularyEntry[],
  key: (entry: VocabularyEntry) => string,
): readonly (readonly [string, number])[] {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    counts.set(key(entry), (counts.get(key(entry)) ?? 0) + 1);
  }

  return Array.from(counts, ([value, count]) => [value, count] as const).sort(
    (a, b) => b[1] - a[1],
  );
}
