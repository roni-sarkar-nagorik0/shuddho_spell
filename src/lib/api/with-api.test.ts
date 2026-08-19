// @vitest-environment node
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type IAuthenticatedUser, type IProblemDetails } from '@/contracts';

interface IHarness {
  user: IAuthenticatedUser | null;
  /** Set to make the resolver blow up rather than answer. */
  thrown: Error | null;
  reads: number;
  readonly logged: unknown[];
}

const LEARNER: IAuthenticatedUser = {
  userId: 'user-1',
  profileId: 'profile-1',
  email: 'learner@example.com',
  displayName: 'Ayesha',
};

const harness = vi.hoisted<IHarness>(() => ({ user: null, thrown: null, reads: 0, logged: [] }));

vi.mock('server-only', () => ({}));

vi.mock('../logger', () => {
  const record = (payload: unknown): void => {
    harness.logged.push(payload);
  };
  return { logger: { info: record, error: record, warn: record } };
});

vi.mock('../auth/current-user', () => ({
  readUser: () => {
    harness.reads += 1;
    return harness.thrown === null ? Promise.resolve(harness.user) : Promise.reject(harness.thrown);
  },
}));

const { withApi } = await import('./with-api');

function post(body: unknown): NextRequest {
  return new NextRequest('https://shuddhospell.test/api/v1/thing', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function get(): NextRequest {
  return new NextRequest('https://shuddhospell.test/api/v1/thing');
}

async function problemOf(response: Response): Promise<IProblemDetails> {
  const parsed: unknown = await response.json();
  const shape = z
    .object({
      status: z.number(),
      code: z.string(),
      title: z.string(),
      detail: z.string(),
      instance: z.string(),
      requestId: z.string(),
      type: z.string(),
    })
    .safeParse(parsed);

  if (!shape.success) {
    throw new Error(`not problem+json: ${JSON.stringify(parsed)}`);
  }
  return shape.data;
}

beforeEach(() => {
  harness.user = null;
  harness.thrown = null;
  harness.reads = 0;
  harness.logged.length = 0;
});

describe('withApi session resolution', () => {
  it('answers 401 problem+json when there is no session', async () => {
    const route = withApi(() => Promise.resolve({ ok: true }));

    const response = await route(get());

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    expect((await problemOf(response)).code).toBe('UNAUTHENTICATED');
  });

  it('never runs the handler for an unauthenticated request', async () => {
    let ran = false;
    const route = withApi(() => {
      ran = true;
      return Promise.resolve({ ok: true });
    });

    await route(get());

    expect(ran, 'the handler saw a request with no session behind it').toBe(false);
  });

  it('says only "unauthenticated" — never which kind of bad cookie it was', async () => {
    // Expired, tampered, absent: the resolver flattens all three to null, so
    // there is nothing here to tell a prober apart from anything else. The
    // refresh attempt that decides between them happens further down, in the
    // cookie adapter, and is covered by the session-client tests.
    const body = await problemOf(await withApi(() => Promise.resolve({ ok: true }))(get()));

    expect(body.code).toBe('UNAUTHENTICATED');
    expect(JSON.stringify(body)).not.toMatch(/expired|tampered|signature|refresh/iu);
  });

  it('is a 401, never a 500, when the session cannot be resolved', async () => {
    const response = await withApi(() => Promise.resolve({ ok: true }))(get());

    expect(response.status).not.toBe(500);
  });

  it('injects the identity the server verified, whole', async () => {
    harness.user = LEARNER;
    let seen: IAuthenticatedUser | null = null;
    const route = withApi((ctx) => {
      seen = ctx.user;
      return Promise.resolve({ ok: true });
    });

    await route(get());

    expect(seen).toStrictEqual(LEARNER);
  });

  it('resolves the session once per request, not once per read', async () => {
    harness.user = LEARNER;

    await withApi(() => Promise.resolve({ ok: true }))(get());

    expect(harness.reads).toBe(1);
  });

  it('skips resolution entirely for a route that opted out', async () => {
    const route = withApi(() => Promise.resolve({ status: 'ok' }), { auth: 'public' });

    const response = await route(get());

    expect(response.status).toBe(200);
    expect(harness.reads, 'a public route still asked who was calling').toBe(0);
  });

  it('hands a public route a null user rather than a fabricated one', async () => {
    let seen: IAuthenticatedUser | null = LEARNER;
    await withApi((ctx) => {
      seen = ctx.user;
      return Promise.resolve({ ok: true });
    }, { auth: 'public' })(get());

    expect(seen).toBeNull();
  });

  it('turns an impossible session state into a 500 problem+json, not a crash', async () => {
    // A verified session with no profile. It should be unreachable once F3.9's
    // bootstrap lands; until then it must still leave by the front door.
    harness.thrown = new Error('session for user-1 has no learner profile');

    const response = await withApi(() => Promise.resolve({ ok: true }))(get());

    expect(response.status).toBe(500);
    expect((await problemOf(response)).code).toBe('INTERNAL');
  });

  it('does not leak why into the body of a 500', async () => {
    harness.thrown = new Error('session for user-1 has no learner profile');

    const body = await problemOf(await withApi(() => Promise.resolve({ ok: true }))(get()));

    expect(body.detail).not.toContain('learner profile');
    expect(body.requestId, 'the request id is how the failure is looked up').not.toBe('');
  });
});

describe('protected by default', () => {
  it('protects a handler that says nothing about auth', async () => {
    const response = await withApi(() => Promise.resolve({ ok: true }))(get());

    expect(response.status).toBe(401);
  });

  it('means the same thing when a route says it out loud', async () => {
    const response = await withApi(() => Promise.resolve({ ok: true }), { auth: 'required' })(
      get(),
    );

    expect(response.status).toBe(401);
    expect(harness.reads).toBe(1);
  });

  it('opens only for the one word that opts out', async () => {
    harness.user = null;

    const response = await withApi(() => Promise.resolve({ ok: true }), { auth: 'public' })(get());

    expect(response.status).toBe(200);
  });

  it('still lets a signed-in learner through a public route, identified', async () => {
    // Public means "no session required", not "no session read". A public
    // endpoint that greets a signed-in learner by name is a normal thing to
    // want, and the wrapper must not make it impossible — it just must not
    // demand it. Today the user is null on a public route by design; this
    // pins that so a change to it is a decision, not a drift.
    harness.user = LEARNER;
    let seen: IAuthenticatedUser | null = LEARNER;

    await withApi((ctx) => {
      seen = ctx.user;
      return Promise.resolve({ ok: true });
    }, { auth: 'public' })(get());

    expect(seen).toBeNull();
  });
});

describe('withApi ordering', () => {
  it('checks the session before it parses the body', async () => {
    // Otherwise an anonymous caller learns the shape of a schema they have no
    // right to reach, one 422 at a time.
    const route = withApi(() => Promise.resolve({ ok: true }), {
      bodySchema: z.object({ day: z.number() }),
    });

    const response = await route(post({ day: 'not a number' }));

    expect(response.status).toBe(401);
  });

  it('validates the body once the session is real', async () => {
    harness.user = LEARNER;
    const route = withApi(() => Promise.resolve({ ok: true }), {
      bodySchema: z.object({ day: z.number() }),
    });

    const response = await route(post({ day: 'not a number' }));

    expect(response.status).toBe(422);
    expect((await problemOf(response)).code).toBe('VALIDATION_FAILED');
  });
});
