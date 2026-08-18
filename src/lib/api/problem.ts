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

  static forbidden(): ApiError {
    return new ApiError(403, PROBLEM_CODES.FORBIDDEN, 'You cannot access this resource.');
  }
}
