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
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
});

export type ProblemCode = (typeof PROBLEM_CODES)[keyof typeof PROBLEM_CODES];
