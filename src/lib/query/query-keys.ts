/**
 * Every cache key in one place.
 *
 * Keys built inline drift — one screen writes `['exam', id]` and another reads
 * `['exams', id]`, and the bug looks like a cache that simply never updates.
 * The arrays are `as const` so a typo is a type error at the call site.
 */
export const queryKeys = {
  dashboard: () => ['dashboard'] as const,
  program: () => ['program'] as const,
  programDay: (dayIndex: number) => ['program', 'day', dayIndex] as const,
  masterySnapshot: () => ['progress', 'mastery'] as const,
  progressSummary: () => ['progress', 'summary'] as const,
  dueReviews: () => ['review', 'due'] as const,
  notifications: () => ['notifications'] as const,
  examReadiness: (code: string) => ['exams', code, 'readiness'] as const,
  examAttempt: (attemptId: string) => ['exams', 'attempts', attemptId] as const,
  examAnswers: (attemptId: string) => ['exams', 'attempts', attemptId, 'answers'] as const,
} as const;
