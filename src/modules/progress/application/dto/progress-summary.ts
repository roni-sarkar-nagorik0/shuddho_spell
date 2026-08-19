export interface IProgressSummary {
  readonly currentDayIndex: number;
  readonly totalDays: number;
  readonly completedDays: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  /** Whether the streak is still alive today, which is not `currentStreak > 0`. */
  readonly streakIsAlive: boolean;
  readonly itemsReviewed: number;
  readonly overallAccuracy: number;
  readonly masteredItems: number;
}
