/** One day of the activity strip. */
export interface IActivityDay {
  /** ISO `YYYY-MM-DD` in the learner's own timezone, not the server's. */
  readonly date: string;
  readonly attempts: number;
  readonly correct: number;
  /** 0..1, or `null` on a day with nothing attempted — which is not 0%. */
  readonly accuracy: number | null;
  /**
   * Time on task, summed from `attempts.latency_ms`.
   *
   * This is the only recorded measure of how long a learner actually spent:
   * `lesson_sessions` has `started_at` and `completed_at`, but the gap between
   * them includes the twenty minutes somebody left the tab open over lunch.
   * Latency per answer is the honest number, and it is always the smaller one.
   */
  readonly minutes: number;
}

export interface IWeeklyActivity {
  /** Oldest first, exactly seven entries, gaps filled with zero days. */
  readonly days: readonly IActivityDay[];
  readonly totalAttempts: number;
  readonly totalMinutes: number;
}
