import { type IRandomSource } from '@/modules/shared/application/ports/random';
import { type Word } from '../../domain/entities/word';
import { type IWordRepository } from '../../domain/repositories/word-repository';
import { type IDictationDemoWord } from '../dto/dictation-demo-word';

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
  ) {}

  async execute(): Promise<IDictationDemoWord | null> {
    const weekIndex = this.random.below(WEEKS) + 1;

    const pool = (await this.words.search({ weekIndex, limit: 400 })).filter(isDemonstrable);

    const chosen = pool[this.random.below(pool.length)];

    if (chosen === undefined) {
      // An unseeded database. Null rather than a thrown error: the marketing
      // page has a written fallback for this, and a landing page that 500s
      // because a demo could not find a word is a worse outcome than a landing
      // page with no demo.
      return null;
    }

    return {
      text: chosen.text,
      ipa: chosen.ipa.value,
      banglaSound: chosen.banglaSound,
      banglaMeaning: chosen.banglaMeaning,
      commonError: chosen.commonMisspellings[0] ?? null,
    };
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
