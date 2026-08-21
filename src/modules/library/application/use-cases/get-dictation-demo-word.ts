import { type IRandomSource } from '@/modules/shared/application/ports/random';
import { wordCount } from '@/modules/shared/domain/text/words-in';
import { type IGrammarExampleSource } from '../../domain/repositories/grammar-example-source';
import { type Word } from '../../domain/entities/word';
import { type ISentenceItemRepository } from '../../domain/repositories/sentence-item-repository';
import { type IWordRepository } from '../../domain/repositories/word-repository';
import {
  type IDictationDemoSentence,
  type IDictationDemoWord,
} from '../dto/dictation-demo-word';

/**
 * The four weeks the corpus has. Restated rather than derived: a fifth week
 * would need a decision about whether the demo should draw from it, and a
 * constant that silently grew would make that decision by accident.
 */
const WEEKS = 4;

/**
 * Tiles a visitor will actually finish.
 *
 * The demo is one interaction on a marketing page, and a fourteen-letter word
 * is a wall of empty boxes rather than an invitation. Words outside this range
 * stay in the course, where a learner has a reason to be patient.
 */
const SHORTEST = 3;
const LONGEST = 9;

/**
 * How many words are offered to the sentence probe before one is settled on.
 *
 * The corpus has 560 sentences and 1,065 demonstrable words, and **496 of those
 * words — 46.6% — appear in a sentence as a whole word.** One candidate would
 * therefore send a visitor away without an example roughly every other word,
 * which is not a feature, it is a feature that flickers.
 *
 * Five candidates, probed **together rather than in turn**, put the odds of
 * finding none at 0.534^5 ≈ 4%: about nineteen words in twenty come with the
 * sentence. Five small indexed reads issued at once cost one round trip; five
 * issued in sequence would cost five, which is the entire reason this is a
 * `Promise.all` and not a loop with an early return.
 *
 * The consequence is stated rather than hidden: a word that appears in a
 * sentence is now **more likely** to be shown than one that does not. For a
 * demo whose whole job is to show the exercise working, that is the right
 * bias — but it is a bias, and the pool is no longer uniform.
 */
const CANDIDATES = 5;

/**
 * Rows the probe reads per candidate.
 *
 * Two jobs, and the second is why it is not four. `ilike '%hand%'` also returns
 * *handle* and *beforehand*, so a few are read and `SentenceItem.contains`
 * decides which are really the word — four was enough for that. But the demo
 * now wants the **longest** sentence rather than the first one, and you cannot
 * pick the longest of a set you did not fetch. Twelve rows is still one indexed
 * read and still one round trip; it is bytes, not latency.
 */
const SENTENCES_PER_CANDIDATE = 12;

/**
 * How much longer a grammar example must be before it is taken over a corpus
 * sentence that also has Bangla.
 *
 * The two sources are not equal. A corpus sentence comes with the Bangla it was
 * authored against, which for the reader this page is written for is worth real
 * words; a grammar example does not. Taking the longest with no margin at all
 * gives a mean of **6.09** words and keeps Bangla on 63% of them. A margin of
 * three gives **6.00** and keeps Bangla on **68%** — nine hundredths of a word
 * for five points of the thing the audience actually reads. Measured over all
 * 580 covered words, not guessed.
 */
const BANGLA_MARGIN = 3;

/**
 * One word from the real corpus, at random, for a visitor with no account.
 *
 * It reads the **seeded** words rather than a list kept beside the landing
 * page. That is the whole point of doing it this way: the demo cannot advertise
 * a word the course does not teach, an IPA the course does not use, or a Bangla
 * gloss nobody reviewed, because there is no second copy for any of those to
 * drift from.
 *
 * It draws one week at a time rather than the whole corpus. A random word out
 * of 1,240 would be one query returning every word the product owns, on a page
 * anonymous visitors hit — this reads a quarter of that.
 *
 * **The pick is not perfectly uniform, and that is a knowing trade.** The four
 * weeks hold 310 words each, but the demo-eligible ones after the filter below
 * are 287 / 290 / 267 / 221, so a word from week 4 comes up about 1.3× as often
 * as one from week 1. Correcting it would mean counting all four weeks before
 * choosing — a second round trip on a marketing page — to change how often a
 * visitor who will see maybe five words sees any particular one. The pool is
 * ~1,065 words either way.
 */
export class GetDictationDemoWordUseCase {
  constructor(
    private readonly words: IWordRepository,
    private readonly random: IRandomSource,
    private readonly sentences: ISentenceItemRepository,
    private readonly grammarExamples: IGrammarExampleSource,
  ) {}

  async execute(): Promise<IDictationDemoWord | null> {
    const weekIndex = this.random.below(WEEKS) + 1;

    const pool = (await this.words.search({ weekIndex, limit: 400 })).filter(isDemonstrable);

    const candidates = this.sample(pool, CANDIDATES);
    const fallback = candidates[0];

    if (fallback === undefined) {
      // An unseeded database. Null rather than a thrown error: the marketing
      // page has a written fallback for this, and a landing page that 500s
      // because a demo could not find a word is a worse outcome than a landing
      // page with no demo.
      return null;
    }

    const probed = await Promise.all(
      candidates.map(async (candidate) => ({
        word: candidate,
        sentence: await this.bestExample(candidate.text),
      })),
    );

    // The first candidate that came back with a real example; failing that, the
    // first candidate as it always was. A visitor is never shown *no* word
    // because the corpus happened to have no sentence for it.
    const chosen = probed.find((entry) => entry.sentence !== null) ?? {
      word: fallback,
      sentence: null,
    };

    return {
      id: chosen.word.id,
      text: chosen.word.text,
      ipa: chosen.word.ipa.value,
      banglaSound: chosen.word.banglaSound,
      banglaMeaning: chosen.word.banglaMeaning,
      commonError: chosen.word.commonMisspellings[0] ?? null,
      sentence: chosen.sentence,
    };
  }

  /**
   * The fullest sentence either source has for this word.
   *
   * Both are asked at once, which costs what the corpus alone cost: the grammar
   * examples are a compiled module and answer without leaving the process, so
   * the `Promise.all` resolves on the database round trip that was already
   * being made.
   *
   * Then the longest of each, and the margin between them. Length is the whole
   * point of having a second source — the corpus runs to four words at the
   * median and nine at its longest, which is enough to show the word has a job
   * and not enough to show English doing anything.
   */
  private async bestExample(word: string): Promise<IDictationDemoSentence | null> {
    const [rows, examples] = await Promise.all([
      this.sentences.findContaining(word, SENTENCES_PER_CANDIDATE),
      this.grammarExamples.findUsing(word),
    ]);

    const fromCorpus = longest(
      rows
        // The database was asked for a substring and answered with one; this is
        // where *handle* stops being an example of *hand*.
        .filter((row) => row.contains(word))
        .map((row) => ({
          id: row.id,
          english: row.englishText,
          bangla: row.banglaText,
          note: null,
        })),
    );

    const fromLessons = longest(
      examples.map((example) => ({
        id: example.id,
        english: example.english,
        bangla: null,
        note: example.note,
      })),
    );

    if (fromCorpus === null || fromLessons === null) {
      return fromCorpus ?? fromLessons;
    }

    return wordCount(fromLessons.english) >= wordCount(fromCorpus.english) + BANGLA_MARGIN
      ? fromLessons
      : fromCorpus;
  }

  /**
   * `count` distinct words from the pool, chosen at random.
   *
   * Distinct matters: drawing the same word five times would spend five queries
   * to learn one thing. This is a partial Fisher-Yates over a copy — it touches
   * `count` positions rather than shuffling 290 words to keep 5.
   */
  private sample(pool: readonly Word[], count: number): readonly Word[] {
    const remaining = [...pool];
    const taken: Word[] = [];

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

/**
 * Whether this word can carry the demo.
 *
 * A word with no recorded misspelling would render a panel that says "most
 * Bengali speakers write" and then nothing, and inventing one to fill the gap
 * is exactly the thing `CLAUDE.md` forbids. Filtering here means the sentence
 * is only ever printed when there is a real error to print.
 */
function isDemonstrable(word: Word): boolean {
  return (
    word.commonMisspellings.length > 0 &&
    word.text.length >= SHORTEST &&
    word.text.length <= LONGEST &&
    // Letters only. A hyphen or an apostrophe needs a tile the learner cannot
    // reach without knowing it is there, which turns the exercise into a guess.
    /^[a-z]+$/u.test(word.text)
  );
}

/**
 * The one with the most words, or null for an empty list.
 *
 * Ties go to the earlier entry, which is arbitrary and fine — two sentences of
 * equal length are equally good at the job, and picking between them on any
 * other basis would be inventing a preference.
 */
function longest(
  candidates: readonly IDictationDemoSentence[],
): IDictationDemoSentence | null {
  return candidates.reduce<IDictationDemoSentence | null>(
    (best, candidate) =>
      best === null || wordCount(candidate.english) > wordCount(best.english) ? candidate : best,
    null,
  );
}
