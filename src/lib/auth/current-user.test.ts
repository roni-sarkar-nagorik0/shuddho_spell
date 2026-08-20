// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface IProfileRow {
  readonly id: string;
  readonly display_name: string;
}

interface IHarness {
  user: { readonly id: string; readonly email?: string } | null;
  userError: { readonly message: string } | null;
  profile: Partial<IProfileRow> | null;
  profileError: { readonly message: string } | null;
  selected: string | null;
  redirects: string[];
}

const harness = vi.hoisted<IHarness>(() => ({
  user: { id: 'user-1', email: 'learner@example.com' },
  userError: null,
  profile: { id: 'profile-1', display_name: 'Ayesha' },
  profileError: null,
  selected: null,
  redirects: [],
}));

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  redirect: (path: string): never => {
    harness.redirects.push(path);
    // The real one throws to unwind the render; anything after it is dead code.
    throw new Error('NEXT_REDIRECT');
  },
}));

vi.mock('../supabase/session-client', () => ({
  createSessionClient: () =>
    Promise.resolve({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: harness.user }, error: harness.userError }),
      },
      from: () => ({
        select: (columns: string) => ({
          eq: () => ({
            maybeSingle: () => {
              harness.selected = columns;
              return Promise.resolve({ data: harness.profile, error: harness.profileError });
            },
          }),
        }),
      }),
    }),
}));

const { MissingProfileError } = await import('./missing-profile-error');
const { readUser, requireUser } = await import('./current-user');

beforeEach(() => {
  harness.user = { id: 'user-1', email: 'learner@example.com' };
  harness.userError = null;
  harness.profile = { id: 'profile-1', display_name: 'Ayesha' };
  harness.profileError = null;
  harness.selected = null;
  harness.redirects.length = 0;
});

describe('requireUser', () => {
  it('returns the learner assembled from the session and their profile', async () => {
    await expect(requireUser()).resolves.toStrictEqual({
      userId: 'user-1',
      profileId: 'profile-1',
      email: 'learner@example.com',
      displayName: 'Ayesha',
    });
  });

  it('redirects to /login when there is no session', async () => {
    harness.user = null;
    harness.userError = { message: 'no session' };

    await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT');
    expect(harness.redirects).toStrictEqual(['/login']);
  });

  it('redirects rather than returning null, so a caller cannot forget to check', async () => {
    harness.user = null;
    harness.userError = { message: 'no session' };

    await expect(requireUser()).rejects.toThrow();
  });

  it('is loud, not signed-out, when a verified session has no profile', async () => {
    harness.profile = null;

    await expect(requireUser()).rejects.toBeInstanceOf(MissingProfileError);
    expect(harness.redirects, 'a redirect here would loop through /login forever').toStrictEqual(
      [],
    );
  });
});

describe('readUser', () => {
  it('reads only the profile columns identity is made of', async () => {
    await readUser();

    expect(harness.selected).toBe('id, display_name');
  });

  it('is null for an anonymous request', async () => {
    harness.user = null;
    harness.userError = { message: 'no session' };

    await expect(readUser()).resolves.toBeNull();
  });

  it('is null when the session carries no email — Google always supplies one', async () => {
    harness.user = { id: 'user-1' };

    await expect(readUser()).resolves.toBeNull();
  });

  it('throws when the profile read fails, rather than inventing an anonymous learner', async () => {
    harness.profile = null;
    harness.profileError = { message: 'permission denied' };

    await expect(readUser()).rejects.toBeInstanceOf(MissingProfileError);
  });

  it('throws when the profile comes back in a shape identity cannot be built from', async () => {
    harness.profile = { id: 'profile-1' };

    await expect(readUser()).rejects.toBeInstanceOf(MissingProfileError);
  });
});
