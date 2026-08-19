// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type IAuthenticatedUser } from '@/contracts';
import { LearnerProfile } from '../../domain/entities/learner-profile';
import { meResponseSchema } from '../dto/me.response';

interface IHarness {
  user: IAuthenticatedUser | null;
  profile: LearnerProfile | null;
  askedFor: string | null;
}

const LEARNER: IAuthenticatedUser = {
  userId: 'user-1',
  profileId: 'p1',
  email: 'learner@example.com',
  displayName: 'Ayesha',
};

const harness = vi.hoisted<IHarness>(() => ({ user: null, profile: null, askedFor: null }));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/logger', () => {
  const noop = (): void => undefined;
  return { logger: { info: noop, error: noop, warn: noop } };
});

vi.mock('@/lib/auth/current-user', () => ({
  readUser: () => Promise.resolve(harness.user),
}));

const { GetMeUseCase } = await import('../../application/use-cases/get-me');
const { createGetMeHandler } = await import('./get-me');

const handler = createGetMeHandler(
  () =>
    new GetMeUseCase({
      findByUserId: (userId: string) => {
        harness.askedFor = userId;
        return Promise.resolve(harness.profile);
      },
      insertIfAbsent: () => Promise.reject(new Error('GET must not write')),
    }),
);

function get(url = 'https://shuddhospell.test/api/v1/me'): NextRequest {
  return new NextRequest(url);
}

async function bodyOf(response: Response): Promise<unknown> {
  const envelope: unknown = await response.json();
  return typeof envelope === 'object' && envelope !== null && 'data' in envelope
    ? envelope.data
    : envelope;
}

beforeEach(() => {
  harness.user = LEARNER;
  harness.profile = new LearnerProfile('p1', 'user-1', 'Ayesha', 'standard28', 4, null);
  harness.askedFor = null;
});

describe('GET /api/v1/me', () => {
  it('returns the profile and the program position', async () => {
    const response = await handler(get());

    expect(response.status).toBe(200);
    expect(meResponseSchema.parse(await bodyOf(response))).toStrictEqual({
      userId: 'user-1',
      profileId: 'p1',
      email: 'learner@example.com',
      displayName: 'Ayesha',
      program: { track: 'standard28', currentDayIndex: 4, totalDays: 28, hasOnboarded: false },
    });
  });

  it('answers in the shape the contract promises', async () => {
    const parsed = meResponseSchema.safeParse(await bodyOf(await handler(get())));

    expect(parsed.success, 'the response drifted from IMeResponse').toBe(true);
  });

  it('carries the total the track implies, not a constant', async () => {
    harness.profile = new LearnerProfile('p1', 'user-1', 'Ayesha', 'sprint21', 19, null);

    const body = meResponseSchema.parse(await bodyOf(await handler(get())));

    expect(body.program.totalDays).toBe(21);
  });

  it('reports onboarding as finished once it is', async () => {
    harness.profile = new LearnerProfile(
      'p1',
      'user-1',
      'Ayesha',
      'standard28',
      4,
      new Date('2026-08-01T10:00:00Z'),
    );

    const body = meResponseSchema.parse(await bodyOf(await handler(get())));

    expect(body.program.hasOnboarded).toBe(true);
  });

  it('is protected — no session, no answer', async () => {
    harness.user = null;

    const response = await handler(get());

    expect(response.status).toBe(401);
    expect(harness.askedFor, 'a profile was read for nobody').toBeNull();
  });

  it('reads the session identity, never one supplied in the url', async () => {
    await handler(get('https://shuddhospell.test/api/v1/me?userId=someone-else'));

    expect(harness.askedFor).toBe('user-1');
  });

  it('is a 404, not a 500, when the profile is gone', async () => {
    harness.profile = null;

    const response = await handler(get());

    expect(response.status).toBe(404);
  });

  it('returns no field the contract does not name', async () => {
    const body = await bodyOf(await handler(get()));
    const keys = typeof body === 'object' && body !== null ? Object.keys(body) : [];

    expect([...keys].sort()).toStrictEqual([
      'displayName',
      'email',
      'profileId',
      'program',
      'userId',
    ]);
  });
});
