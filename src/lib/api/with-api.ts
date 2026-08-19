import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type z } from 'zod';
import {
  PROBLEM_CODES,
  type IApiResponse,
  type IAuthenticatedUser,
  type IFieldError,
} from '@/contracts';
import { readUser } from '../auth/current-user';
import { logger } from '../logger';
import { ApiError, problem } from './problem';

export interface IHandlerContext<TBody, TQuery> {
  readonly request: NextRequest;
  readonly requestId: string;
  readonly body: TBody;
  readonly query: TQuery;
  readonly user: IAuthenticatedUser | null;
}

export interface IWithApiOptions<TBody, TQuery> {
  /** `true` (the default) returns 401 unless a session cookie resolves to a user. */
  readonly auth?: boolean;
  readonly bodySchema?: z.ZodType<TBody>;
  readonly querySchema?: z.ZodType<TQuery>;
}

type Handler<TBody, TQuery> = (ctx: IHandlerContext<TBody, TQuery>) => Promise<unknown>;

function toFieldErrors(error: ZodError): readonly IFieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * The one route-handler wrapper. Owns request ids, auth, Zod parsing, logging,
 * and the mapping from any thrown value to RFC 7807 problem+json.
 */
export function withApi<TBody = undefined, TQuery = undefined>(
  handler: Handler<TBody, TQuery>,
  options: IWithApiOptions<TBody, TQuery> = {},
): (request: NextRequest) => Promise<NextResponse> {
  const requireAuth = options.auth ?? true;

  return async function route(request: NextRequest): Promise<NextResponse> {
    const requestId = crypto.randomUUID();
    const instance = new URL(request.url).pathname;
    const startedAt = Date.now();

    try {
      // One resolver, shared with `requireUser()`. A handler and a page must
      // never be able to disagree about who is signed in, and they would the
      // first time one of them grew a rule the other did not.
      //
      // Every way this can fail — no cookie, a cookie the auth server rejects,
      // a refresh that did not work — arrives here as `null` and leaves as the
      // same 401 problem+json. Nothing about which one it was reaches the
      // caller: that is a probe answered, not an error explained.
      let user: IAuthenticatedUser | null = null;
      if (requireAuth) {
        user = await readUser();
        if (user === null) {
          throw ApiError.unauthenticated();
        }
      }

      let body = undefined as TBody;
      if (options.bodySchema !== undefined) {
        const raw: unknown = await request.json().catch(() => undefined);
        body = options.bodySchema.parse(raw);
      }

      let query = undefined as TQuery;
      if (options.querySchema !== undefined) {
        const raw = Object.fromEntries(new URL(request.url).searchParams);
        query = options.querySchema.parse(raw);
      }

      const data = await handler({ request, requestId, body, query, user });

      logger.info(
        { requestId, method: request.method, path: instance, ms: Date.now() - startedAt },
        'request ok',
      );

      const payload: IApiResponse<unknown> = {
        data,
        meta: { requestId, timestamp: new Date().toISOString() },
      };
      return NextResponse.json(payload, { headers: { 'x-request-id': requestId } });
    } catch (caught: unknown) {
      const details =
        caught instanceof ZodError
          ? problem({
              status: 422,
              code: PROBLEM_CODES.VALIDATION_FAILED,
              title: 'Validation failed',
              detail: 'One or more fields are invalid.',
              instance,
              requestId,
              errors: toFieldErrors(caught),
            })
          : caught instanceof ApiError
            ? problem({
                status: caught.status,
                code: caught.code,
                title: caught.name,
                detail: caught.message,
                instance,
                requestId,
                ...(caught.fieldErrors === undefined ? {} : { errors: caught.fieldErrors }),
              })
            : problem({
                status: 500,
                code: PROBLEM_CODES.INTERNAL,
                title: 'Internal error',
                detail: 'Something went wrong. The request id identifies this failure.',
                instance,
                requestId,
              });

      logger.error(
        { requestId, method: request.method, path: instance, status: details.status, err: caught },
        'request failed',
      );

      return NextResponse.json(details, {
        status: details.status,
        headers: { 'content-type': 'application/problem+json', 'x-request-id': requestId },
      });
    }
  };
}
