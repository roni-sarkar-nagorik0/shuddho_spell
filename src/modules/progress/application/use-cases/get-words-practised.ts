import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IAttemptRepository } from '@/modules/lessons/domain/repositories/attempt-repository';
import { type Word } from '@/modules/library/domain/entities/word';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { zonedDayStart } from '@/modules/shared/domain/value-objects/zoned-day-start';
import { type IDemoAttemptRepository } from '../../domain/repositories/demo-attempt-repository';
import {
  type IPractiseTally,
  type IPractisedWord,
  type IWordsPractised,
} from '../dto/words-practised';

export interface IGetWordsPractisedInput {
  readonly userId: string;
}

/**
 * How far back each read reaches.
 *
 * The course attempts are read newest-first and filtered to today here rather
 * than in the query — `IAttemptRepository.findByProfile` takes a limit and no
 * date, and widening that port for one panel would change a seam four other
 * callers share. The cap is what makes it correct in practice: today's
 * attempts come first, so the filter only drops rows that are already older
 * than today. A learner who submits more than this in one day would see the
 * earliest of them missing, and 400 is far past any real day — a full 28-day
 * lesson is on the order of 40.
 */
const COURSE_SCAN = 400;
const DEMO_SCAN = 400;

/**
 * What a learner worked on today, counted the way they would count it.
 *
 * **Distinct words, and separately, tries.** "I learned six words" and "I made
 * twenty-two attempts" are different claims and the panel makes both, because
 * one number pretending to be the other is how a progress screen starts
 * flattering the person reading it. A word tried six times is one word.
 *
 * **Today is the learner's today.** The boundary comes from
 * `zonedDayStart(…, profile.timezone)`, not from the server's midnight — the
 * same rule the streak and the review schedule are written under. A learner in
 * Dhaka answering at 00:30 has answered today, whatever UTC thinks.
 *
 * Course and demo are kept apart all the way through; see `IWordsPractised`.
 */
export class GetWordsPractisedUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly attempts: IAttemptRepository,
    private readonly demoAttempts: IDemoAttemptRepository,
    private readonly words: IWordRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: IGetWordsPractisedInput): Promise<IWordsPractised> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const now = this.clock.now();
    const today = LocalDate.fromInstant(now, profile.timezone);
    const dayStart = zonedDayStart(today.value, profile.timezone);

    const [courseAttempts, demoAttempts] = await Promise.all([
      this.attempts.findByProfile(profile.id, COURSE_SCAN),
      this.demoAttempts.findSince(profile.id, dayStart, DEMO_SCAN),
    ]);

    const course = courseAttempts.filter(
      (attempt) => attempt.itemType === 'word' && attempt.createdAt.getTime() >= dayStart.getTime(),
    );

    // One batched read for both tallies. Two `findByIds` calls would be two
    // round trips for a set that overlaps heavily — the same word met in a
    // lesson and at the front door is one row either way.
    const wordIds = [
      ...new Set([
        ...course.map((attempt) => attempt.itemId),
        ...demoAttempts.map((attempt) => attempt.wordId),
      ]),
    ];

    const byId = new Map(
      (wordIds.length === 0 ? [] : await this.words.findByIds(wordIds)).map((word) => [
        word.id,
        word,
      ]),
    );

    return {
      date: today.value,
      course: tally(
        course.map((attempt) => ({
          wordId: attempt.itemId,
          isCorrect: attempt.isCorrect,
        })),
        byId,
      ),
      demo: tally(
        demoAttempts.map((attempt) => ({
          wordId: attempt.wordId,
          isCorrect: attempt.isCorrect,
        })),
        byId,
      ),
    };
  }
}

interface ICounted {
  readonly wordId: string;
  readonly isCorrect: boolean;
}

/**
 * Rolls a flat list of attempts into one word per row.
 *
 * A word the content pipeline no longer has is dropped rather than rendered as
 * a blank line: the tally is a list of words, and a row with no word in it is
 * not one. It cannot happen while `demo_attempts.word_id` cascades, and it is
 * one line to be right about anyway.
 */
function tally(attempts: readonly ICounted[], byId: ReadonlyMap<string, Word>): IPractiseTally {
  const rows = new Map<string, { tries: number; settled: boolean }>();

  for (const attempt of attempts) {
    const existing = rows.get(attempt.wordId) ?? { tries: 0, settled: false };

    rows.set(attempt.wordId, {
      tries: existing.tries + 1,
      settled: existing.settled || attempt.isCorrect,
    });
  }

  const words: IPractisedWord[] = [];

  for (const [wordId, counted] of rows) {
    const word = byId.get(wordId);

    if (word === undefined) {
      continue;
    }

    words.push({
      wordId,
      text: word.text,
      ipa: word.ipa.value,
      banglaSound: word.banglaSound,
      tries: counted.tries,
      settled: counted.settled,
    });
  }

  // Alphabetical, so the list is the same list on every refresh. Ordering by
  // "most tried" would reshuffle the panel under a learner as they work.
  words.sort((a, b) => a.text.localeCompare(b.text));

  return {
    distinctWords: words.length,
    tries: words.reduce((total, word) => total + word.tries, 0),
    settled: words.filter((word) => word.settled).length,
    words,
  };
}
