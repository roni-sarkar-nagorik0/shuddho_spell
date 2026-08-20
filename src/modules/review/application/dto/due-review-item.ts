import { type AttemptItemType } from '@/modules/shared/domain/value-objects/item-type';
import { type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';

/** One thing to review, with what the learner needs to attempt it. */
export interface IDueReviewItem {
  readonly reviewItemId: string;
  readonly itemId: string;
  readonly itemType: AttemptItemType;
  /** The word, or the Bangla prompt for a sentence. Never the answer. */
  readonly prompt: string;
  readonly daysOverdue: number;
  /** What went wrong last time, so the UI can prime the learner. */
  readonly lastErrorTags: readonly ErrorTag[];
}

export interface IDueReviewQueue {
  readonly items: readonly IDueReviewItem[];
  /**
   * How many were due in total. The cap hides the rest, and hiding them
   * silently would leave a learner returning after a fortnight wondering why
   * the queue never empties.
   */
  readonly totalDue: number;
}
