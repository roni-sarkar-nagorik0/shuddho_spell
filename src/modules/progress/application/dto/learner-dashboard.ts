export interface IDashboardToday {
  readonly dayIndex: number;
  readonly title: string;
  readonly estimatedMinutes: number;
  /** True when a session for today is open and part-finished. */
  readonly inProgress: boolean;
  readonly stage: string | null;
}

/**
 * Everything the dashboard shows, in one answer.
 *
 * The screen is one question — "what should I do now" — and answering it in
 * five round trips would let the five disagree: a due count fetched after the
 * streak, a position fetched before a lesson finished in another tab.
 */
export interface ILearnerDashboard {
  readonly displayName: string;
  readonly currentDayIndex: number;
  readonly totalDays: number;
  readonly currentStreak: number;
  readonly streakIsAlive: boolean;
  readonly dueReviewCount: number;
  readonly today: IDashboardToday | null;
  readonly hasFinishedProgram: boolean;
}
