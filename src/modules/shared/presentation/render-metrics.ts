import { type IMetricsSnapshot } from '@/modules/shared/application/ports/metrics-reader';

/**
 * Prometheus text exposition. Hand-rolled on purpose: five gauges do not
 * justify a client library, and the format is four lines of specification.
 */
function gauge(name: string, help: string, value: number): string {
  return [`# HELP ${name} ${help}`, `# TYPE ${name} gauge`, `${name} ${String(value)}`].join('\n');
}

/**
 * The five numbers worth alerting on, chosen for what they say when they are
 * **wrong**: attempts flat while sessions climb means the write path is broken;
 * live exam attempts growing without bound means rule 9's auto-submit cron has
 * stopped; review items due growing without limit means the scheduler is not
 * rescheduling. None of them is a vanity count.
 *
 * Pure, so it is usable from anywhere and testable with a literal.
 */
export function renderMetrics(snapshot: IMetricsSnapshot): string {
  return `${[
    gauge('shuddhospell_learners_total', 'Learner profiles.', snapshot.learners),
    gauge(
      'shuddhospell_lesson_sessions_total',
      'Lesson sessions ever opened.',
      snapshot.lessonSessions,
    ),
    gauge(
      'shuddhospell_attempts_total',
      'Answers submitted. Flat while sessions climb means a broken write path.',
      snapshot.attempts,
    ),
    gauge(
      'shuddhospell_exam_attempts_in_progress',
      'Live exam attempts. Unbounded growth means the auto-submit cron has stopped.',
      snapshot.examAttemptsInProgress,
    ),
    gauge(
      'shuddhospell_review_items_due',
      'Review items past due. Unbounded growth means the scheduler is not rescheduling.',
      snapshot.reviewItemsDue,
    ),
  ].join('\n\n')}\n`;
}
