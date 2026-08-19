import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type IAuthenticatedUser } from '@/contracts';

interface IHarness {
  result: IAuthenticatedUser | null;
  thrown: Error | null;
}

const LEARNER: IAuthenticatedUser = {
  userId: 'user-1',
  profileId: 'profile-1',
  email: 'learner@example.com',
  displayName: 'Ayesha',
};

const harness = vi.hoisted<IHarness>(() => ({ result: null, thrown: null }));

vi.mock('server-only', () => ({}));

vi.mock('./current-user', () => ({
  readUser: () =>
    harness.thrown === null ? Promise.resolve(harness.result) : Promise.reject(harness.thrown),
}));

const { MissingProfileError } = await import('./missing-profile-error');
const { SessionBoundary } = await import('./session-boundary');
const { useSession } = await import('./session-context');

function Who(): React.ReactElement {
  const user = useSession();

  return <p>{user === null ? 'nobody' : user.displayName}</p>;
}

beforeEach(() => {
  harness.result = null;
  harness.thrown = null;
});

// `globals` is off in vitest.config.ts, so Testing Library's automatic cleanup
// never registers and one render leaks into the next.
afterEach(cleanup);

describe('SessionBoundary', () => {
  it('puts the learner where a Client Component can reach them', async () => {
    harness.result = LEARNER;

    render(await SessionBoundary({ children: <Who /> }));

    expect(screen.getByText('Ayesha')).toBeInTheDocument();
  });

  it('provides null for an anonymous visitor', async () => {
    render(await SessionBoundary({ children: <Who /> }));

    expect(screen.getByText('nobody')).toBeInTheDocument();
  });

  it('shows nobody rather than taking the page down when a session has no profile', async () => {
    harness.thrown = new MissingProfileError('user-1');

    render(await SessionBoundary({ children: <Who /> }));

    expect(screen.getByText('nobody')).toBeInTheDocument();
  });

  it('lets every other failure through — swallowing them would hide a broken database', async () => {
    harness.thrown = new Error('the database is on fire');

    await expect(SessionBoundary({ children: <Who /> })).rejects.toThrow(
      'the database is on fire',
    );
  });
});

/**
 * `04-authentication.md`: "Nothing else reads the session. No handler calls
 * `supabase.auth.getUser()` inline." That is a rule about the whole tree, so it
 * is checked against the whole tree rather than trusted.
 */
describe('the three ways in, and only three', () => {
  const ALLOWED: readonly string[] = [
    // The one resolver. requireUser() and withApi({ auth }) both go through it.
    'src/lib/auth/current-user.ts',
    // And the middleware, which refreshes the session rather than reading an
    // identity out of it — the only other place allowed to ask.
    'src/middleware.ts',
  ];

  function sourceFiles(directory: string): readonly string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      if (!/\.tsx?$/u.test(entry.name) || entry.name.includes('.test.')) return [];
      return [path];
    });
  }

  it('calls getUser in three files and nowhere else', () => {
    const callers = sourceFiles('src').filter((path) =>
      readFileSync(path, 'utf8').includes('auth.getUser('),
    );

    expect([...callers].sort()).toStrictEqual([...ALLOWED].sort());
  });
});
