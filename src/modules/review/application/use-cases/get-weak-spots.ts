import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { type IReviewItemRepository } from '../../domain/repositories/review-item-repository';
import { type IScheduleBucket, type IWeakSpot, type IWeakSpots } from '../dto/weak-spots';

export interface IGetWeakSpotsInput {
  readonly userId: string;
}

/**
 * The buckets of the schedule axis, in order.
 *
 * `upperBound` is days from today, inclusive. The ladder of
 * `06-spaced-repetition.md` is 1, 3, 7, 16 and 35 days, so the boundaries are
 * placed where the intervals actually land rather than on round numbers.
 */
const BUCKETS: readonly { key: string; label: string; upperBound: number }[] = [
  { key: 'overdue', label: 'Overdue', upperBound: -1 },
  { key: 'today', label: 'Today', upperBound: 0 },
  { key: 'soon', label: '1–3 days', upperBound: 3 },
  { key: 'week', label: '4–7 days', upperBound: 7 },
  { key: 'fortnight', label: '8–16 days', upperBound: 16 },
  { key: 'later', label: '17+ days', upperBound: Number.POSITIVE_INFINITY },
];

/**
 * Everything the learner has ever got wrong, with when it comes back.
 *
 * **The schedule axis is `review_items.due_at` and nothing else.** Not the
 * interval index re-derived into a date, not "seen five times so probably next
 * week" — the scheduler wrote a timestamp and this reads it. The two would
 * agree today and diverge the first time the policy changed, and the version
 * on screen would be the wrong one.
 *
 * Days are counted in the learner's own timezone: an item due at 23:00 tonight
 * in Dhaka is due *today*, and a UTC subtraction would file it under tomorrow.
 *
 * Three batched reads. `findByProfile` returns the whole history — this is the
 * screen that shows all of it, so there is nothing to page over at the
 * repository.
 */
export class GetWeakSpotsUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly reviews: IReviewItemRepository,
    private readonly words: IWordRepository,
    private readonly sentences: ISentenceItemRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: IGetWeakSpotsInput): Promise<IWeakSpots> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const tracked = await this.reviews.findByProfile(profile.id);

    const [words, sentences] = await Promise.all([
      this.words.findByIds(
        tracked.filter((item) => item.itemType === 'word').map((item) => item.itemId),
      ),
      this.sentences.findByIds(
        tracked.filter((item) => item.itemType === 'sentence').map((item) => item.itemId),
      ),
    ]);

    const prompts = new Map<string, string>([
      ...words.map((word): readonly [string, string] => [word.id, word.text]),
      // The Bangla prompt, never the English target — the same rule the review
      // queue follows, for the same reason.
      ...sentences.map((sentence): readonly [string, string] => [sentence.id, sentence.banglaText]),
    ]);

    const today = LocalDate.fromInstant(this.clock.now(), profile.timezone);

    const items: readonly IWeakSpot[] = tracked
      .flatMap((item): readonly IWeakSpot[] => {
        const prompt = prompts.get(item.itemId);

        // Content deleted out from under a review row. Skipped, not blanked:
        // the schedule is not wrong, the content is gone.
        if (prompt === undefined) {
          return [];
        }

        const dueOn = LocalDate.fromInstant(item.dueAt, profile.timezone);

        return [
          {
            reviewItemId: item.id,
            itemId: item.itemId,
            itemType: item.itemType,
            prompt,
            dueAt: item.dueAt.toISOString(),
            daysUntilDue: today.daysUntil(dueOn),
            intervalIndex: item.intervalIndex,
            timesSeen: item.timesSeen,
            timesCorrect: item.timesCorrect,
            accuracy: item.timesSeen === 0 ? null : item.timesCorrect / item.timesSeen,
            consecutiveCorrect: item.consecutiveCorrect,
            isMastered: item.isMastered,
            lastErrorTags: item.lastErrorTags,
          },
        ];
      })
      .sort((a, b) => {
        const left = a.accuracy ?? 0;
        const right = b.accuracy ?? 0;

        return left === right ? a.daysUntilDue - b.daysUntilDue : left - right;
      });

    return {
      items,
      schedule: bucket(items),
      totalTracked: items.length,
      masteredCount: items.filter((item) => item.isMastered).length,
    };
  }
}

function bucket(items: readonly IWeakSpot[]): readonly IScheduleBucket[] {
  return BUCKETS.map((definition, index) => {
    const lowerBound = BUCKETS[index - 1]?.upperBound ?? Number.NEGATIVE_INFINITY;

    return {
      key: definition.key,
      label: definition.label,
      count: items.filter(
        (item) => item.daysUntilDue > lowerBound && item.daysUntilDue <= definition.upperBound,
      ).length,
    };
  });
}
