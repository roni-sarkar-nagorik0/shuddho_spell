import { type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';
import { type AttemptItemType } from '@/modules/shared/domain/value-objects/item-type';

/** One row of the weak-spots table: a review item, whole. */
export interface IWeakSpot {
  readonly reviewItemId: string;
  readonly itemId: string;
  readonly itemType: AttemptItemType;
  readonly prompt: string;
  /**
   * `review_items.due_at`, verbatim, as an ISO instant.
   *
   * The schedule axis is drawn from **this** and nothing else — not from the
   * interval index, not from a client-side guess at when the next repetition
   * lands. The scheduler owns the date; the screen reads it.
   */
  readonly dueAt: string;
  /** Negative when overdue. Whole days, in the learner's own timezone. */
  readonly daysUntilDue: number;
  /** Position on the interval ladder — 1, 3, 7, 16, 35 days and so on. */
  readonly intervalIndex: number;
  readonly timesSeen: number;
  readonly timesCorrect: number;
  readonly accuracy: number | null;
  readonly consecutiveCorrect: number;
  readonly isMastered: boolean;
  readonly lastErrorTags: readonly ErrorTag[];
}

/** One column of the schedule axis. */
export interface IScheduleBucket {
  readonly key: string;
  readonly label: string;
  readonly count: number;
}

export interface IWeakSpots {
  /** Weakest first: lowest accuracy, ties broken by the most overdue. */
  readonly items: readonly IWeakSpot[];
  readonly schedule: readonly IScheduleBucket[];
  readonly totalTracked: number;
  readonly masteredCount: number;
}
