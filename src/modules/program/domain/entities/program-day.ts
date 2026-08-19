import { type DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { type ItemType } from '@/modules/shared/domain/value-objects/item-type';
import { type Track } from '@/modules/shared/domain/value-objects/track';

/** One row of `program_day_items`, already ordered. */
export interface IProgramDayItem {
  readonly itemType: ItemType;
  readonly itemId: string;
  readonly orderIndex: number;
}

/**
 * One day of the programme: what it covers and what it is made of.
 *
 * The items arrive as one ordered list rather than three arrays, which is how
 * `program_day_items` stores them and how the lesson plays them — a day is a
 * sequence, and splitting it by type at the boundary would throw away the order
 * that sequence depends on. The `wordIds` / `sentenceItemIds` / `ruleFamilyIds`
 * of `05-domain-model.md` are derivations of it, offered as methods.
 */
export class ProgramDay {
  constructor(
    readonly id: string,
    readonly track: Track,
    readonly dayIndex: DayIndex,
    readonly weekIndex: number,
    readonly title: string,
    readonly description: string,
    readonly estimatedMinutes: number,
    /** Ascending by `orderIndex`; the repository sorts, the entity trusts. */
    readonly items: readonly IProgramDayItem[],
  ) {}

  wordIds(): readonly string[] {
    return this.idsOfType('word');
  }

  sentenceItemIds(): readonly string[] {
    return this.idsOfType('sentence');
  }

  ruleFamilyIds(): readonly string[] {
    return this.idsOfType('rule_family');
  }

  /**
   * A day with no words and no sentences has nothing for a learner to do. The
   * content pipeline in Phase 9 needs to name these rather than ship a day that
   * opens to an empty screen.
   */
  isEmpty(): boolean {
    return this.wordIds().length === 0 && this.sentenceItemIds().length === 0;
  }

  private idsOfType(itemType: ItemType): readonly string[] {
    return this.items.filter((item) => item.itemType === itemType).map((item) => item.itemId);
  }
}
