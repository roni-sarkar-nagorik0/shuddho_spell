export const RATE_LIMITER = Symbol('RATE_LIMITER');

/** How much of an allowance a route grants, and over what window. */
export interface IRateLimitRule {
  /**
   * Names the allowance, not the caller. Two routes sharing a key share a
   * budget, which is occasionally what you want — several exam-answer endpoints
   * spending one ceiling — and never something to arrive at by accident.
   */
  readonly key: string;
  readonly limit: number;
  readonly windowSeconds: number;
}

export interface IRateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  /** Seconds until the window resets. Goes out as `Retry-After`. */
  readonly retryAfterSeconds: number;
}

/**
 * The port `11-api-surface.md` names: Postgres by default so the app needs no
 * extra infrastructure, Upstash Redis swappable behind the same interface.
 *
 * Declared in `src/contracts` rather than in a module's `application/ports`,
 * and that is a deliberate departure from `05-domain-model.md`'s list. Its only
 * caller is `withApi`, which lives in `src/lib` — and `lib` may import
 * `contracts` and may not import `application`. Putting the interface where the
 * boundary rule allows both sides to see it beats either loosening the rule or
 * writing the interface out twice.
 */
export interface IRateLimiter {
  /**
   * Counts one request against a subject's allowance and reports the decision.
   *
   * Counting and deciding are one call because they have to be one operation:
   * a limiter that reads a count, decides, then writes has a window between the
   * read and the write that more connections will find.
   */
  readonly consume: (rule: IRateLimitRule, subject: string) => Promise<IRateLimitDecision>;
}
