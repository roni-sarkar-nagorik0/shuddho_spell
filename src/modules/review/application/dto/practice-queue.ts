import { type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';
import { type AttemptItemType } from '@/modules/shared/domain/value-objects/item-type';

/** One weakness, ranked. The label is the IPA symbol or the rule family's code. */
export interface IPracticeWeakness {
  readonly dimension: 'phoneme' | 'rule_family';
  readonly dimensionId: string;
  readonly label: string;
  readonly attempts: number;
  readonly correct: number;
  readonly accuracy: number;
  /**
   * Attempts × the gap to mastery. **This, not accuracy, is the rank.**
   *
   * A sound at 20% over three attempts is noise; a sound at 55% over ninety is
   * where the learner is actually losing marks. Ordering by accuracy alone puts
   * the noise first and sends them to drill something they have barely met.
   */
  readonly expectedLoss: number;
}

export interface IPracticeItem {
  readonly reviewItemId: string;
  readonly itemId: string;
  readonly itemType: AttemptItemType;
  readonly prompt: string;
  readonly daysOverdue: number;
  readonly lastErrorTags: readonly ErrorTag[];
  /**
   * Why this item is in the queue at this position. Shown to the learner, and
   * the reason `/practice` can claim its drills are chosen rather than shuffled.
   */
  readonly reason: 'weakness' | 'overdue' | 'due';
}

export interface IPracticeQueue {
  /** Weakest first. Never shuffled, never sampled. */
  readonly weaknesses: readonly IPracticeWeakness[];
  readonly items: readonly IPracticeItem[];
  readonly totalDue: number;
  /** The dimension the learner asked to focus on, when they arrived from a matrix. */
  readonly focus: IPracticeWeakness | null;
}
