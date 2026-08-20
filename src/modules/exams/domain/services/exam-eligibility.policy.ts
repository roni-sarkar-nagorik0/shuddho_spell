import { type ExamAttempt } from '../entities/exam-attempt';
import { type ExamDefinition } from '../entities/exam-definition';

const SECONDS_PER_HOUR = 3600;
const MILLISECONDS_PER_SECOND = 1000;

/**
 * Whether a learner may start this exam now.
 *
 * A union rather than a boolean plus two nullable fields, because the three
 * answers need different things said to the learner and a boolean loses the
 * difference. "Never again" and "not for another six hours" are not the same
 * news, and a client that cannot tell them apart shows the wrong screen.
 */
export type ExamEligibility =
  | { readonly kind: 'eligible' }
  | { readonly kind: 'exhausted'; readonly maxAttempts: number; readonly used: number }
  | { readonly kind: 'cooling_down'; readonly remainingSeconds: number; readonly retryAt: Date };

/**
 * Attempt limits and cooldowns, decided in the domain and nowhere else.
 *
 * Rule 5 of `08-exam-engine.md` is that both are **server-enforced**. That is
 * not a statement about where a function lives, it is a statement about what
 * the client is allowed to know: the catalogue may show a lock, and the lock is
 * decoration — every start goes through this, and the browser's opinion of how
 * many attempts it has used is never an input.
 *
 * Pure. The attempts arrive as a list and the instant as an argument, so the
 * boundary case that matters — a retake asked for one second before the
 * cooldown ends — is a table of numbers rather than a test that has to wait
 * twenty-four hours.
 */
export class ExamEligibilityPolicy {
  evaluate(
    definition: ExamDefinition,
    priorAttempts: readonly ExamAttempt[],
    now: Date,
  ): ExamEligibility {
    // The diagnostic has no pass mark, no limit and no cooldown — 004 keeps
    // those three together, so one null here means all three.
    if (!definition.isGraded()) {
      return { kind: 'eligible' };
    }

    const maxAttempts = definition.maxAttempts;

    if (maxAttempts !== null && priorAttempts.length >= maxAttempts) {
      return { kind: 'exhausted', maxAttempts, used: priorAttempts.length };
    }

    const cooldownHours = definition.cooldownHours;
    const lastFinishedAt = mostRecentSubmission(priorAttempts);

    if (cooldownHours === null || lastFinishedAt === null) {
      return { kind: 'eligible' };
    }

    const retryAt = new Date(
      lastFinishedAt.getTime() + cooldownHours * SECONDS_PER_HOUR * MILLISECONDS_PER_SECOND,
    );

    if (now.getTime() >= retryAt.getTime()) {
      return { kind: 'eligible' };
    }

    return {
      kind: 'cooling_down',
      // Rounded up: reporting 0 seconds remaining while still refusing the
      // start is the one answer a client cannot act on.
      remainingSeconds: Math.ceil((retryAt.getTime() - now.getTime()) / MILLISECONDS_PER_SECOND),
      retryAt,
    };
  }
}

/**
 * The latest submission, by `submittedAt` and not by attempt number.
 *
 * They usually agree and need not: an attempt abandoned and auto-submitted by
 * the cron job finishes at its deadline, which can be after a later attempt was
 * created. The cooldown runs from when the learner last *sat* an exam.
 */
function mostRecentSubmission(attempts: readonly ExamAttempt[]): Date | null {
  let latest: Date | null = null;

  for (const attempt of attempts) {
    const submittedAt = attempt.submittedAt;

    if (submittedAt !== null && (latest === null || submittedAt.getTime() > latest.getTime())) {
      latest = submittedAt;
    }
  }

  return latest;
}
