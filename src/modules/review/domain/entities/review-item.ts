import { type AttemptItemType } from '@/modules/shared/domain/value-objects/item-type';
import { type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { type IReviewSchedulingPolicy } from '../services/review-scheduling-policy';

export interface IReviewItemProps {
  readonly id: string;
  readonly profileId: string;
  readonly itemId: string;
  readonly itemType: AttemptItemType;
  /** Position on the ladder. The ladder's numbers live in the policy. */
  readonly intervalIndex: number;
  readonly dueAt: Date;
  readonly timesSeen: number;
  readonly timesCorrect: number;
  /**
   * Correct answers on **distinct** calendar days, not correct answers. Three
   * in one sitting is short-term memory; the counter must not reward it.
   */
  readonly consecutiveCorrect: number;
  /** The learner-local day of the last correct answer. Null if never right. */
  readonly lastCorrectOn: LocalDate | null;
  readonly isMastered: boolean;
  readonly lastErrorTags: readonly ErrorTag[];
}

/**
 * One thing a learner is being made to remember, and when it next comes back.
 */
export class ReviewItem {
  readonly id: string;
  readonly profileId: string;
  readonly itemId: string;
  readonly itemType: AttemptItemType;
  readonly intervalIndex: number;
  readonly dueAt: Date;
  readonly timesSeen: number;
  readonly timesCorrect: number;
  readonly consecutiveCorrect: number;
  readonly lastCorrectOn: LocalDate | null;
  readonly isMastered: boolean;
  readonly lastErrorTags: readonly ErrorTag[];

  constructor(props: IReviewItemProps) {
    this.id = props.id;
    this.profileId = props.profileId;
    this.itemId = props.itemId;
    this.itemType = props.itemType;
    this.intervalIndex = props.intervalIndex;
    this.dueAt = props.dueAt;
    this.timesSeen = props.timesSeen;
    this.timesCorrect = props.timesCorrect;
    this.consecutiveCorrect = props.consecutiveCorrect;
    this.lastCorrectOn = props.lastCorrectOn;
    this.isMastered = props.isMastered;
    this.lastErrorTags = props.lastErrorTags;
  }

  /**
   * Applies one answer and returns a new instance.
   *
   * Correct climbs one rung; wrong drops to rung 0 from wherever it was,
   * including the top. That asymmetry is the whole design — a deterministic
   * ladder with no ease factors means the only way back to the longest interval
   * is to earn every rung again, and a learner can be told exactly that. The
   * length of that interval is the policy's business, not this entity's — which
   * is why this sentence does not name it.
   *
   * `consecutiveCorrect` counts **days**, not answers. Two correct answers on
   * the same learner-local day leave it where it was, which is what stops a
   * learner drilling one word five times in a session and being told they have
   * mastered it. `06-spaced-repetition.md` makes that a mandatory case.
   */
  recordResult(
    isCorrect: boolean,
    now: Date,
    localDay: LocalDate,
    policy: IReviewSchedulingPolicy,
    errorTags: readonly ErrorTag[] = [],
    timezone = 'UTC',
  ): ReviewItem {
    const alreadyCountedToday = this.lastCorrectOn !== null && this.lastCorrectOn.equals(localDay);

    const consecutiveCorrect = isCorrect
      ? alreadyCountedToday
        ? this.consecutiveCorrect
        : this.consecutiveCorrect + 1
      : 0;

    return new ReviewItem({
      ...this.toProps(),
      intervalIndex: policy.nextIntervalIndex(this.intervalIndex, isCorrect),
      dueAt: policy.nextDueAt(this.intervalIndex, isCorrect, now, timezone),
      timesSeen: this.timesSeen + 1,
      timesCorrect: this.timesCorrect + (isCorrect ? 1 : 0),
      consecutiveCorrect,
      lastCorrectOn: isCorrect ? localDay : this.lastCorrectOn,
      // Mastery is not revoked by a later wrong answer — the item drops to rung
      // 0 and comes back tomorrow, which is the correction. F4.6 owns the rule
      // that grants it.
      isMastered: this.isMastered,
      // Only a wrong answer carries tags; a correct one clears them, because
      // "what went wrong last time" is answered by the last time it went wrong.
      lastErrorTags: isCorrect ? [] : errorTags,
    });
  }

  /**
   * Overdue by how many whole days, measured at the learner's day boundary
   * rather than by elapsed hours. This is the primary sort for today's queue,
   * and an item due at 23:00 last night is a day overdue this morning even
   * though ten hours have passed.
   */
  daysOverdue(today: LocalDate, timezone: string): number {
    return LocalDate.fromInstant(this.dueAt, timezone).daysUntil(today);
  }

  isDue(now: Date): boolean {
    return this.dueAt.getTime() <= now.getTime();
  }

  /** Accuracy so far, 0–1. An unseen item is not 0% — it is unknown, and sorts last. */
  accuracy(): number {
    return this.timesSeen === 0 ? 1 : this.timesCorrect / this.timesSeen;
  }

  private toProps(): IReviewItemProps {
    return {
      id: this.id,
      profileId: this.profileId,
      itemId: this.itemId,
      itemType: this.itemType,
      intervalIndex: this.intervalIndex,
      dueAt: this.dueAt,
      timesSeen: this.timesSeen,
      timesCorrect: this.timesCorrect,
      consecutiveCorrect: this.consecutiveCorrect,
      lastCorrectOn: this.lastCorrectOn,
      isMastered: this.isMastered,
      lastErrorTags: this.lastErrorTags,
    };
  }
}
