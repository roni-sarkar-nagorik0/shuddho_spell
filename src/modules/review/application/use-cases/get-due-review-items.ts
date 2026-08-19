import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { type ReviewItem } from '../../domain/entities/review-item';
import { type IReviewItemRepository } from '../../domain/repositories/review-item-repository';
import { type IDueReviewItem, type IDueReviewQueue } from '../dto/due-review-item';

export interface IGetDueReviewItemsInput {
  readonly userId: string;
}

/**
 * A product decision, not a performance one.
 *
 * `06-spaced-repetition.md` is explicit: a learner returning after two weeks
 * must not face a 200-item wall. The remainder stay due and surface tomorrow,
 * which is why the cap lives here rather than in a SQL `limit` — the queue is
 * shortened for the learner's sake, and nothing about the schedule changes.
 */
const DAILY_CAP = 25;

/**
 * Today's review queue: what is due, most urgent first, capped.
 */
export class GetDueReviewItemsUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly reviews: IReviewItemRepository,
    private readonly words: IWordRepository,
    private readonly sentences: ISentenceItemRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: IGetDueReviewItemsInput): Promise<IDueReviewQueue> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const now = this.clock.now();
    const today = LocalDate.fromInstant(now, profile.timezone);

    const due = await this.reviews.findDue(profile.id, now);

    const ordered = this.order(due, today, profile.timezone).slice(0, DAILY_CAP);

    const words = await this.words.findByIds(
      ordered.filter((item) => item.itemType === 'word').map((item) => item.itemId),
    );
    const sentences = await this.sentences.findByIds(
      ordered.filter((item) => item.itemType === 'sentence').map((item) => item.itemId),
    );

    const prompts = new Map<string, string>([
      ...words.map((word): readonly [string, string] => [word.id, word.text]),
      // The Bangla prompt, not the English target. A review queue that showed
      // the answer beside the question would be a reading exercise.
      ...sentences.map((sentence): readonly [string, string] => [
        sentence.id,
        sentence.banglaText,
      ]),
    ]);

    return {
      totalDue: due.length,
      items: ordered.flatMap((item): readonly IDueReviewItem[] => {
        const prompt = prompts.get(item.itemId);

        // Content deleted out from under a review row. Skipped rather than
        // rendered blank: the schedule is not wrong, the content is gone.
        return prompt === undefined
          ? []
          : [
              {
                reviewItemId: item.id,
                itemId: item.itemId,
                itemType: item.itemType,
                prompt,
                daysOverdue: item.daysOverdue(today, profile.timezone),
                lastErrorTags: item.lastErrorTags,
              },
            ];
      }),
    };
  }

  /**
   * Most overdue first, ties broken by lowest accuracy.
   *
   * The tiebreak is what makes the cap fair. Twenty-five items all one day
   * overdue is the common case, and taking them in whatever order the database
   * returned would keep showing the learner the ones they already know.
   */
  private order(
    items: readonly ReviewItem[],
    today: LocalDate,
    timezone: string,
  ): readonly ReviewItem[] {
    return [...items].sort((left, right) => {
      const overdue =
        right.daysOverdue(today, timezone) - left.daysOverdue(today, timezone);

      return overdue !== 0 ? overdue : left.accuracy() - right.accuracy();
    });
  }
}
