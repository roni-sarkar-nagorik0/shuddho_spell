import { z } from 'zod';
import { PROBLEM_CODES, type IFieldError, type IResponseMeta, type ProblemCode } from '@/contracts';
import { ApiError } from './problem';

/**
 * The typed fetch client. Every response is validated against the caller's schema before it
 * reaches a component; a drifted contract throws `ApiError` here rather than rendering
 * `undefined` three layers down.
 *
 * Client-side only by intent — a Server Component calls the use case through the composition
 * root instead of taking a network hop (see `.claude/docs/11-api-surface.md`).
 */

const metaSchema = z.object({
  requestId: z.string(),
  timestamp: z.string(),
});

const envelopeSchema = z.object({
  data: z.unknown(),
  meta: metaSchema,
});

const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  instance: z.string(),
  code: z.string(),
  requestId: z.string(),
  errors: z.array(fieldErrorSchema).optional(),
});

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type QueryValue = string | number | boolean | undefined;

export interface IApiRequestOptions<T> {
  /** Validates the `data` member of the envelope. Required — there is no unvalidated path. */
  readonly schema: z.ZodType<T>;
  readonly method?: HttpMethod;
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, QueryValue>>;
  readonly signal?: AbortSignal;
  /** Absolute origin for non-browser callers (tests, server-side smoke checks). */
  readonly baseUrl?: string;
}

export interface IApiResult<T> {
  readonly data: T;
  readonly meta: IResponseMeta;
}

function toProblemCode(code: string): ProblemCode {
  const known = Object.values(PROBLEM_CODES).find((candidate) => candidate === code);
  return known ?? PROBLEM_CODES.INTERNAL;
}

function toFieldErrors(error: z.ZodError): readonly IFieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

function buildUrl(path: string, options: Pick<IApiRequestOptions<unknown>, 'query' | 'baseUrl'>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }
  const suffix = search.size === 0 ? '' : `?${search.toString()}`;
  const base = options.baseUrl ?? '';
  return `${base}${path}${suffix}`;
}

interface IParsedBody {
  /** `false` for a body that is not JSON at all — an HTML error page, a proxy timeout. */
  readonly parsed: boolean;
  readonly value: unknown;
}

async function readJson(response: Response): Promise<IParsedBody> {
  const text = await response.text();
  if (text === '') {
    return { parsed: true, value: undefined };
  }
  try {
    return { parsed: true, value: JSON.parse(text) };
  } catch {
    return { parsed: false, value: text };
  }
}

function throwFromErrorResponse(payload: unknown, response: Response, url: string): never {
  const parsed = problemSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      PROBLEM_CODES.INTERNAL,
      `${url} failed with status ${String(response.status)} and no problem+json body.`,
    );
  }
  const problem = parsed.data;
  throw new ApiError(problem.status, toProblemCode(problem.code), problem.detail, problem.errors);
}

/** Returns the validated `data` and the response `meta`. */
export async function apiRequest<T>(
  path: string,
  options: IApiRequestOptions<T>,
): Promise<IApiResult<T>> {
  const url = buildUrl(path, options);
  const method = options.method ?? 'GET';
  const hasBody = options.body !== undefined;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: hasBody ? { 'content-type': 'application/json' } : {},
      ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
      credentials: 'same-origin',
    });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'unknown error';
    throw ApiError.network(`${method} ${url} did not reach the server: ${reason}`);
  }

  const body = await readJson(response);

  // Order matters: a failed request reports its own status even when the body is an HTML
  // error page. Parsing first would bury every upstream 502 under a generic 500.
  if (!response.ok) {
    throwFromErrorResponse(body.value, response, url);
  }

  if (!body.parsed) {
    throw ApiError.contractMismatch(`${url} returned a non-JSON body with status 200.`);
  }

  const envelope = envelopeSchema.safeParse(body.value);
  if (!envelope.success) {
    throw ApiError.contractMismatch(
      `${url} did not return the { data, meta } envelope.`,
      toFieldErrors(envelope.error),
    );
  }

  const data = options.schema.safeParse(envelope.data.data);
  if (!data.success) {
    throw ApiError.contractMismatch(
      `${url} returned data that does not match its contract.`,
      toFieldErrors(data.error),
    );
  }

  return { data: data.data, meta: envelope.data.meta };
}

/** The common case: the validated `data`, with `meta` dropped. */
export async function apiFetch<T>(path: string, options: IApiRequestOptions<T>): Promise<T> {
  const result = await apiRequest(path, options);
  return result.data;
}
