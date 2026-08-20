import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { type ErrorTagger } from '@/modules/library/domain/services/error-tagger';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { ReviewItemNotFoundError } from '../../domain/errors/review-item-not-found.error';
import { type IReviewItemRepository } from '../../domain/repositories/review-item-repository';
import { type IReviewSchedulingPolicy } from '../../domain/services/review-scheduling-policy';

export interface ISubmitReviewAttemptInput {
  readonly userId: string;
  readonly reviewItemId: string;
  readonly submittedValue: string;
}

export interface ISubmitReviewAttemptOutput {
  readonly isCorrect: boolean;
  readonly errorTags: readonly ErrorTag[];
  readonly correctValue: string | null;
  readonly isMastered: boolean;
  /** When it comes back. Shown as "in 7 days", which is a promise worth keeping. */
  readonly nextDueAt: string;
}

/**
 * One answer in the review queue.
 *
 * Deliberately **not** an `Attempt` row. `attempts.session_id` is not nullable
 * in 003 and a review happens outside a lesson session; inventing a session to
 * hang it off would corrupt every per-session number the product reports.
 * The review item's own counters — `timesSeen`, `timesCorrect`,
 * `consecutiveCorrect` — are the record of what happened here.
 */
export class SubmitReviewAttemptUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly reviews: IReviewItemRepository,
    private readonly words: IWordRepository,
    private readonly sentences: ISentenceItemRepository,
    private readonly tagger: ErrorTagger,
    private readonly policy: IReviewSchedulingPolicy,
    private readonly clock: IClock,
  ) {}

  async execute(input: ISubmitReviewAttemptInput): Promise<ISubmitReviewAttemptOutput> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const due = await this.reviews.findDue(profile.id, this.clock.now());
    const item = due.find((candidate) => candidate.id === input.reviewItemId);

    if (item === undefined) {
      throw new ReviewItemNotFoundError(input.reviewItemId);
    }

    const marked =
      item.itemType === 'word'
        ? await this.markWord(item.itemId, input.submittedValue)
        : await this.markSentence(item.itemId, input.submittedValue);

    const now = this.clock.now();
    const localDay = LocalDate.fromInstant(now, profile.timezone);

    // One write, so no transaction to arrange. A review answer touches the
    // review item and nothing else — that is the difference between this and a
    // lesson attempt, which moves four tables and needs 013's function.
    const updated = await this.reviews.upsert(
      item.recordResult(
        marked.isCorrect,
        now,
        localDay,
        this.policy,
        marked.errorTags,
        profile.timezone,
      ),
    );

    return {
      isCorrect: marked.isCorrect,
      errorTags: marked.errorTags,
      correctValue: marked.isCorrect ? null : marked.correctValue,
      isMastered: updated.isMastered,
      nextDueAt: updated.dueAt.toISOString(),
    };
  }

  private async markWord(
    itemId: string,
    submitted: string,
  ): Promise<{ isCorrect: boolean; errorTags: readonly ErrorTag[]; correctValue: string }> {
    const word = await this.words.findById(itemId);

    if (word === null) {
      throw new ReviewItemNotFoundError(itemId);
    }

    const isCorrect = word.matches(submitted);

    return {
      isCorrect,
      errorTags: isCorrect ? [] : this.tagger.tagSpelling(word.text, submitted),
      correctValue: word.text,
    };
  }

  private async markSentence(
    itemId: string,
    submitted: string,
  ): Promise<{ isCorrect: boolean; errorTags: readonly ErrorTag[]; correctValue: string }> {
    const sentence = await this.sentences.findById(itemId);

    if (sentence === null) {
      throw new ReviewItemNotFoundError(itemId);
    }

    const isCorrect = sentence.accepts(submitted);

    return {
      isCorrect,
      errorTags: isCorrect ? [] : this.tagger.tagSentence(sentence.englishText, submitted),
      correctValue: sentence.englishText,
    };
  }
}
