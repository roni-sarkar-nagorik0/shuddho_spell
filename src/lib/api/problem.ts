import { PROBLEM_CODES, type IFieldError, type IProblemDetails, type ProblemCode } from '@/contracts';

interface IProblemInput {
  readonly status: number;
  readonly code: ProblemCode;
  readonly title: string;
  readonly detail: string;
  readonly instance: string;
  readonly requestId: string;
  readonly errors?: readonly IFieldError[];
}

const TYPE_BASE = 'https://shuddhospell.app/problems/';

export function problem(input: IProblemInput): IProblemDetails {
  const base = {
    type: `${TYPE_BASE}${input.code.toLowerCase().replaceAll('_', '-')}`,
    title: input.title,
    status: input.status,
    detail: input.detail,
    instance: input.instance,
    code: input.code,
    requestId: input.requestId,
  };
  return input.errors === undefined ? base : { ...base, errors: input.errors };
}

/** Thrown by application code; `withApi` turns it into problem+json. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ProblemCode;
  readonly fieldErrors: readonly IFieldError[] | undefined;

  constructor(
    status: number,
    code: ProblemCode,
    message: string,
    fieldErrors?: readonly IFieldError[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  static notFound(what: string): ApiError {
    return new ApiError(404, PROBLEM_CODES.NOT_FOUND, `${what} was not found.`);
  }

  static unauthenticated(): ApiError {
    return new ApiError(401, PROBLEM_CODES.UNAUTHENTICATED, 'Sign in to continue.');
  }

  /**
   * No user is involved, so there is nothing to sign in as. The detail says
   * what is actually wrong, and says nothing at all about the secret.
   */
  static cronUnauthorised(): ApiError {
    return new ApiError(
      401,
      PROBLEM_CODES.CRON_UNAUTHORISED,
      'This endpoint is called by the scheduler.',
    );
  }

  /**
   * The retry window is in the message as well as the `Retry-After` header,
   * because a person reading a JSON body in a console should not have to know
   * to look at headers to find out how long to wait.
   */
  static rateLimited(retryAfterSeconds: number): ApiError {
    return new ApiError(
      429,
      PROBLEM_CODES.RATE_LIMITED,
      `Too many requests. Try again in ${String(retryAfterSeconds)} seconds.`,
    );
  }

  /**
   * The request is well-formed and the resource is simply not in a state where
   * it makes sense. Distinct from 422, which says the input was malformed —
   * telling a client its body was invalid when the body was fine sends them
   * looking in the wrong place.
   */
  static conflict(detail: string): ApiError {
    return new ApiError(409, PROBLEM_CODES.CONFLICT, detail);
  }

  static forbidden(): ApiError {
    return new ApiError(403, PROBLEM_CODES.FORBIDDEN, 'You cannot access this resource.');
  }

  /**
   * The server answered, but not in the shape the contract promises. This is a bug on one
   * side of the wire, never a user error — it must be loud, not rendered as `undefined`.
   */
  static contractMismatch(detail: string, fieldErrors?: readonly IFieldError[]): ApiError {
    return new ApiError(500, PROBLEM_CODES.INTERNAL, detail, fieldErrors);
  }

  /** The request never produced a response: offline, DNS, TLS, abort. */
  static network(detail: string): ApiError {
    return new ApiError(500, PROBLEM_CODES.INTERNAL, detail);
  }
}
