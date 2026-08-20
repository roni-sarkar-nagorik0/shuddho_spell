/** RFC 7807 `application/problem+json`. The only error shape the API emits. */
export interface IProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
  /** Stable machine-readable code — clients branch on this, never on `title`. */
  readonly code: string;
  readonly requestId: string;
  readonly errors?: readonly IFieldError[];
}

export interface IFieldError {
  readonly field: string;
  readonly message: string;
}

export const PROBLEM_CODES = Object.freeze({
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  /**
   * A scheduled job called without the shared secret. Separate from
   * `UNAUTHENTICATED` on purpose: the two are fixed by different people. One
   * means a learner has to sign in; this one means whoever configured the
   * scheduler has the wrong secret, and an operator reading a log at 3am should
   * not have to guess which.
   */
  CRON_UNAUTHORISED: 'CRON_UNAUTHORISED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  /**
   * A write arrived after the exam's server deadline — `08-exam-engine.md`
   * rule 2. Its own code rather than a `CONFLICT`, because the client's
   * response to it is specific and immediate: stop accepting input, stop the
   * countdown, and tell the learner the paper has closed. A generic conflict
   * would be indistinguishable from a replayed request, which needs no such
   * reaction.
   */
  EXAM_TIME_EXPIRED: 'EXAM_TIME_EXPIRED',
  /**
   * Every attempt at this exam has been used — three for a milestone, two for
   * the final. Terminal for the learner, so the client shows a different screen
   * from the one it shows for a cooldown: there is no waiting this out.
   */
  EXAM_ATTEMPTS_EXHAUSTED: 'EXAM_ATTEMPTS_EXHAUSTED',
  /**
   * A retake asked for inside the cooldown. Distinct from exhausted because the
   * answer is "not yet" rather than "never", and the detail carries how long —
   * `08-exam-engine.md` rule 5 asks for the remaining time to be in the
   * problem.
   */
  EXAM_COOLDOWN_ACTIVE: 'EXAM_COOLDOWN_ACTIVE',
  INTERNAL: 'INTERNAL',
});

export type ProblemCode = (typeof PROBLEM_CODES)[keyof typeof PROBLEM_CODES];
