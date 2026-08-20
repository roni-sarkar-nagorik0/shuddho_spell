export interface IMetricsSnapshot {
  readonly learners: number;
  readonly lessonSessions: number;
  readonly attempts: number;
  readonly examAttemptsInProgress: number;
  readonly reviewItemsDue: number;
}

export const METRICS_READER = Symbol('METRICS_READER');

/**
 * The operational counts, behind a port (F13.8).
 *
 * The first version of this reached straight into `IDatabase` from the route,
 * and the boundary lint refused it — correctly. `app` and `presentation` may
 * not see `infrastructure`, and the fix for that is a port, never an exception.
 *
 * It is a port rather than a repository because none of these numbers belongs
 * to a learner or to an aggregate: they are counts over the whole installation,
 * asked for by a scraper, and there is no entity to return.
 */
export interface IMetricsReader {
  readonly snapshot: (now: Date) => Promise<IMetricsSnapshot>;
}
