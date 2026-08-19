// @vitest-environment node
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SECRET = 'a-long-enough-cron-secret-value';

interface IHarness {
  secret: string | undefined;
  readonly logged: unknown[];
  runs: number;
}

const harness = vi.hoisted<IHarness>(() => ({
  secret: 'a-long-enough-cron-secret-value',
  logged: [],
  runs: 0,
}));

vi.mock('server-only', () => ({}));

vi.mock('../env.server', () => ({
  get serverEnv() {
    return { CRON_SECRET: harness.secret, NODE_ENV: 'test' };
  },
}));

vi.mock('../logger', () => {
  const record = (payload: unknown): void => {
    harness.logged.push(payload);
  };
  return { logger: { info: record, error: record, warn: record } };
});

vi.mock('../auth/current-user', () => ({
  readUser: () => Promise.resolve(null),
}));

const { withCron } = await import('./with-cron');

const job = withCron(() => {
  harness.runs += 1;
  return Promise.resolve({ sent: 0 });
});

function call(headers: Record<string, string> = {}, url = 'https://shuddhospell.test/api/cron/x'): NextRequest {
  return new NextRequest(url, { headers });
}

async function codeOf(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  return typeof body === 'object' && body !== null && 'code' in body ? body.code : undefined;
}

beforeEach(() => {
  harness.secret = SECRET;
  harness.logged.length = 0;
  harness.runs = 0;
});

describe('withCron', () => {
  it('runs the job when the bearer secret matches', async () => {
    const response = await job(call({ authorization: `Bearer ${SECRET}` }));

    expect(response.status).toBe(200);
    expect(harness.runs).toBe(1);
  });

  it('answers 401 with no authorization header at all', async () => {
    const response = await job(call());

    expect(response.status).toBe(401);
    expect(harness.runs).toBe(0);
  });

  it('answers 401 for the wrong secret', async () => {
    const response = await job(call({ authorization: 'Bearer not-the-secret-at-all-no' }));

    expect(response.status).toBe(401);
    expect(harness.runs).toBe(0);
  });

  it('answers 401 for the right secret without the Bearer scheme', async () => {
    const response = await job(call({ authorization: SECRET }));

    expect(response.status).toBe(401);
  });

  it('answers 401 for a prefix of the secret, so length is not a clue', async () => {
    const response = await job(call({ authorization: `Bearer ${SECRET.slice(0, 10)}` }));

    expect(response.status).toBe(401);
  });

  it('names its own failure, so an operator is not sent to fix a login', async () => {
    const response = await job(call());

    expect(await codeOf(response)).toBe('CRON_UNAUTHORISED');
    expect(response.headers.get('content-type')).toBe('application/problem+json');
  });

  it('refuses when CRON_SECRET is unset, rather than waving the request through', async () => {
    harness.secret = undefined;

    const response = await job(call({ authorization: 'Bearer anything' }));

    expect(response.status).toBe(401);
    expect(harness.runs).toBe(0);
  });

  it('says in the log that the secret is missing, so the 401 is diagnosable', async () => {
    harness.secret = undefined;

    await job(call({ authorization: 'Bearer anything' }));

    expect(JSON.stringify(harness.logged)).toContain('CRON_SECRET is not set');
  });

  it('will not take the secret from the query string', async () => {
    // Query strings end up in access logs. A caller that puts it there has
    // published it, and is still not authenticated.
    const response = await job(
      call({}, `https://shuddhospell.test/api/cron/x?secret=${SECRET}`),
    );

    expect(response.status).toBe(401);
  });

  it('never writes the secret anywhere it could be read back', async () => {
    await job(call({ authorization: `Bearer ${SECRET}` }));
    const failed = await job(call({ authorization: 'Bearer wrong' }));

    expect(JSON.stringify(harness.logged), 'the secret reached a log line').not.toContain(SECRET);
    expect(await failed.text(), 'the secret reached the response body').not.toContain(SECRET);
  });

  it('does not require a session — there is nobody to sign in as', async () => {
    const response = await job(call({ authorization: `Bearer ${SECRET}` }));

    expect(response.status).toBe(200);
  });
});

/**
 * "Constant time" is a property of how the comparison runs, and no assertion
 * about its result can see it — swap `timingSafeEqual` for `===` and every
 * behavioural test above still passes. A timing benchmark would be flaky on a
 * shared machine, so what is guarded here is the shape of the code that has
 * the property, which is the thing a well-meaning simplification would remove.
 */
describe('the comparison itself', () => {
  const source = readFileSync('src/lib/api/with-cron.ts', 'utf8');

  it('compares with timingSafeEqual, not with an operator that exits early', () => {
    expect(source).toContain('timingSafeEqual(');
    expect(source, 'the secret is compared with an early-exit operator').not.toMatch(
      /(provided|expected)\s*(===|!==|==|!=)\s*(provided|expected|`Bearer)/u,
    );
  });

  it('hashes both sides first, so the buffers are never different lengths', () => {
    // timingSafeEqual throws on a length mismatch, and throwing early leaks the
    // length one guess at a time. A fixed-width digest removes the question.
    expect(source.match(/createHash\('sha256'\)/gu) ?? []).toHaveLength(2);
  });

  it('reads the secret from the header and never from the url', () => {
    expect(source).toContain("headers.get('authorization')");
    expect(source, 'the secret is read out of the query string').not.toMatch(
      /searchParams|nextUrl\.search/u,
    );
  });
});
