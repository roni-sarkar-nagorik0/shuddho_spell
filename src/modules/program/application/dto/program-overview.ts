import { type Track } from '@/modules/shared/domain/value-objects/track';

/** One tile on the overview grid. */
export interface IProgramDaySummary {
  readonly dayIndex: number;
  readonly weekIndex: number;
  readonly title: string;
  readonly estimatedMinutes: number;
  readonly isComplete: boolean;
  /**
   * Whether the learner may open it.
   *
   * The programme is sequential, so this is not the same as "not yet complete":
   * day 12 is unlocked only once the learner has reached it. Deciding it here
   * rather than in the component means the API and the page cannot disagree,
   * and a client that ignores it still gets refused by the use case.
   */
  readonly isUnlocked: boolean;
}

export interface IProgramOverview {
  readonly track: Track;
  readonly totalDays: number;
  readonly currentDayIndex: number;
  readonly completedDays: number;
  readonly days: readonly IProgramDaySummary[];
}
