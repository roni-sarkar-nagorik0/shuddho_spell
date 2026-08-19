import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type z } from 'zod';
import {
  PROBLEM_CODES,
  type IApiResponse,
  type IAuthenticatedUser,
  type IFieldError,
  type IRateLimiter,
  type IRateLimitRule,
} from '@/contracts';
import { readUser } from '../auth/current-user';
import { logger } from '../logger';
import { PostgresRateLimiter } from '../rate-limit/postgres-rate-limiter';
import { ApiError, problem } from './problem';

export interface IHandlerContext<TBody, TQuery> {
  readonly request: NextRequest;
  readonly requestId: string;
  readonly body: TBody;
  readonly query: TQuery;
  readonly user: IAuthenticatedUser | null;
}

/**
 * Two spellings, not three. A boolean would work just as well and that is the
 * problem: `auth: false` reads as a flag someone flipped, while `auth: 'public'`
 * reads as a claim about the route, and one of those is harder to write by
 * accident. It is also greppable — `04-authentication.md` says routes are
 * protected by default and public by explicit opt-out, and a word can be
 * counted across the tree in a way a boolean cannot.
 */
export type AuthRequirement = 'required' | 'public';

export interface IWithApiOptions<TBody, TQuery> {
  /**
   * Omitted means `'required'`. Protection is never something a route has to
   * remember to ask for: a handler written tomorrow is closed until its author
   * writes down, in this one word, that it should not be.
   */
  readonly auth?: AuthRequirement;
  readonly bodySchema?: z.ZodType<TBody>;
  readonly querySchema?: z.ZodType<TQuery>;

  /**
   * Opt-in, per `11-api-surface.md`: "rate limits on every write route".
   *
   * Not a default applied to everything. A ceiling on reads would put a
   * database round trip in front of `/api/health`, and the threat model does
   * not call for one — a learner refreshing a dashboard is not an attacker,
   * and `11` says as much about exam answers.
   */
  readonly rateLimit?: IRateLimitRule;

  /**
   * Overridable so the wrapper is testable without a database. Production never
   * passes it, and there is exactly one implementation behind it.
   */
  readonly rateLimiter?: IRateLimiter;
}

/**
 * Who the allowance belongs to.
 *
 * A signed-in learner is counted by their own id, which is what stops two
 * learners behind one office NAT from spending each other's budget. Only an
 * anonymous caller falls back to an address, and `x-forwarded-for` is spoofable
 * — worth stating plainly rather than trusting: for a public route it is the
 * best subject available, and the consequence of a forged one is a stranger
 * getting their own bucket rather than reaching anybody's data.
 */
function rateLimitSubject(request: NextRequest, user: IAuthenticatedUser | null): string {
  if (user !== null) {
    return `user:${user.userId}`;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();

  return `ip:${first === undefined || first.length === 0 ? 'unknown' : first}`;
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
  const requireAuth = (options.auth ?? 'required') === 'required';
  const rule = options.rateLimit;
  const limiter = options.rateLimiter ?? new PostgresRateLimiter();

  return async function route(request: NextRequest): Promise<NextResponse> {
    const requestId = crypto.randomUUID();
    const instance = new URL(request.url).pathname;
    const startedAt = Date.now();
    let retryAfterSeconds: number | null = null;

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

      // **After** the session, deliberately. On a protected route an anonymous
      // flood is answered 401 without touching the limiter's table, so the
      // cheapest rejection stays the cheapest. It also means the subject is a
      // learner id wherever there is one, and never an address standing in for
      // several people.
      if (rule !== undefined) {
        const decision = await limiter.consume(rule, rateLimitSubject(request, user));

        if (!decision.allowed) {
          retryAfterSeconds = decision.retryAfterSeconds;
          throw ApiError.rateLimited(decision.retryAfterSeconds);
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
        headers: {
          'content-type': 'application/problem+json',
          'x-request-id': requestId,
          // RFC 9110 says a 429 should say when to come back. A client that has
          // to guess will guess badly, and usually immediately.
          ...(retryAfterSeconds === null ? {} : { 'retry-after': String(retryAfterSeconds) }),
        },
      });
    }
  };
}
