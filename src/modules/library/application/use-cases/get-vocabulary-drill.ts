import { type IRandomSource } from '@/modules/shared/application/ports/random';
import { type VocabularyEntry } from '../../domain/entities/vocabulary-entry';
import { type ICourseWordIndex } from '../../domain/repositories/course-word-index';
import { type IVocabularySource } from '../../domain/repositories/vocabulary-source';
import { type IVocabularyDrill, type IVocabularyDrillQuestion } from '../dto/vocabulary-drill';

export interface IGetVocabularyDrillInput {
  readonly count: number;
}

/** Four options: the answer and three others. More is a reading test. */
const OPTIONS = 4;

/** A ceiling, so a caller cannot ask for the corpus one question at a time. */
const MAX_QUESTIONS = 20;

/**
 * How many entries are examined for distractors before the search gives up and
 * takes whatever it has.
 *
 * The rule below wants distractors of the *same part of speech* — a question
 * whose four options are three nouns and one adjective is answered by grammar
 * rather than by vocabulary, which makes it a free mark and a bad
 * demonstration. Scanning the whole 777 for every question would be 777 × n
 * comparisons on the landing page's render path; forty candidates is enough to
 * find three matches for every part of speech the corpus holds in quantity.
 */
const DISTRACTOR_ATTEMPTS = 40;

/**
 * A short multiple-choice drill over the vocabulary corpus.
 *
 * **This is the demonstration, not an assessment.** It is what the landing page
 * shows a visitor with no account and what the dashboard shows a learner who
 * has thirty seconds — a word, four meanings, and the answer the moment they
 * tap. Nothing is stored, nothing is marked and no review item is created; the
 * moment this drill fed `review_items` it would be a lesson, and lessons are
 * server-authoritative for reasons this is not built for.
 *
 * **Distractors come from the corpus, never invented.** Three real synonyms
 * belonging to other words, matched on part of speech. A made-up wrong answer
 * would be a word this product had put in front of a learner without standing
 * behind it, and on a screen selling precision that is the one thing it cannot
 * do.
 *
 * The chance comes through `IRandomSource` rather than `Math.random`, which is
 * what makes "the answer is not always in the same position" a property that
 * can be asserted rather than observed.
 */
export class GetVocabularyDrillUseCase {
  constructor(
    private readonly vocabulary: IVocabularySource,
    private readonly random: IRandomSource,
    private readonly courseWords: ICourseWordIndex,
  ) {}

  async execute(input: IGetVocabularyDrillInput): Promise<IVocabularyDrill> {
    const all = this.vocabulary.listAll();
    const wanted = Math.min(MAX_QUESTIONS, Math.max(1, input.count));
    const chosen = this.sample(all, wanted);

    return Promise.resolve({
      questions: chosen.flatMap((entry) => {
        const question = this.ask(entry, all);

        return question === null ? [] : [question];
      }),
      totalEntries: all.length,
    });
  }

  /**
   * One question, or nothing.
   *
   * Nothing rather than a short question: a corpus with only two adverbs would
   * otherwise produce a three-option question sitting beside four-option ones,
   * and a visitor would read the odd one out as a bug. Dropping it costs a
   * question out of six on a screen whose job is to look right.
   */
  private ask(entry: VocabularyEntry, all: readonly VocabularyEntry[]): IVocabularyDrillQuestion | null {
    const answer = entry.bestSynonym;
    const distractors = this.distractors(entry, all, answer);

    if (distractors.length < OPTIONS - 1) {
      return null;
    }

    const options = [answer, ...distractors];

    // Fisher-Yates over four items, so the answer is not always first. Its
    // index is tracked through the swaps rather than searched for afterwards —
    // `indexOf` would find the wrong one if a distractor ever equalled the
    // answer, which the filter below prevents but which is not this line's job
    // to depend on.
    let answerIndex = 0;

    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = this.random.below(i + 1);
      const a = options[i];
      const b = options[j];

      if (a === undefined || b === undefined) {
        continue;
      }

      options[i] = b;
      options[j] = a;

      if (answerIndex === i) {
        answerIndex = j;
      } else if (answerIndex === j) {
        answerIndex = i;
      }
    }

    return {
      word: entry.word,
      partOfSpeech: entry.partOfSpeech,
      topic: entry.topic,
      options,
      answerIndex,
      synonyms: entry.synonyms,
      inCourse: this.courseWords.has(entry.word),
    };
  }

  /**
   * Three wrong answers that are wrong for the right reason.
   *
   * Same part of speech, different headword, and never a synonym this entry
   * also accepts — `magnify` offers `expand` and `enlarge`, and a question that
   * marked `enlarge` wrong would be teaching an untruth to make the drill
   * work.
   */
  private distractors(
    entry: VocabularyEntry,
    all: readonly VocabularyEntry[],
    answer: string,
  ): readonly string[] {
    const rejected = new Set<string>([answer, entry.word, ...entry.synonyms]);
    const picked: string[] = [];

    for (let attempt = 0; attempt < DISTRACTOR_ATTEMPTS && picked.length < OPTIONS - 1; attempt += 1) {
      const candidate = all[this.random.below(all.length)];

      if (
        candidate === undefined ||
        candidate.partOfSpeech !== entry.partOfSpeech ||
        rejected.has(candidate.bestSynonym)
      ) {
        continue;
      }

      rejected.add(candidate.bestSynonym);
      picked.push(candidate.bestSynonym);
    }

    return picked;
  }

  /**
   * `count` distinct entries, chosen at random.
   *
   * A partial Fisher-Yates over a copy — it touches `count` positions rather
   * than shuffling 777 entries to keep six. Distinct matters: a drill that
   * asked the same word twice in six questions would look broken in a way that
   * is hard to unsee.
   */
  private sample(pool: readonly VocabularyEntry[], count: number): readonly VocabularyEntry[] {
    const remaining = [...pool];
    const taken: VocabularyEntry[] = [];

    while (taken.length < count && remaining.length > 0) {
      const index = this.random.below(remaining.length);
      const [picked] = remaining.splice(index, 1);

      if (picked !== undefined) {
        taken.push(picked);
      }
    }

    return taken;
  }
}
