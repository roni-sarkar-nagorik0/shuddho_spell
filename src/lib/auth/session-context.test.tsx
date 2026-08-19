import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { type IAuthenticatedUser } from '@/contracts';
import { SessionProvider, useSession } from './session-context';

const LEARNER: IAuthenticatedUser = {
  userId: 'user-1',
  profileId: 'profile-1',
  email: 'learner@example.com',
  displayName: 'Ayesha',
};

function Who(): React.ReactElement {
  const user = useSession();

  return <p>{user === null ? 'nobody' : user.displayName}</p>;
}

afterEach(cleanup);

describe('useSession', () => {
  it('hands a Client Component the learner the server verified', () => {
    render(
      <SessionProvider user={LEARNER}>
        <Who />
      </SessionProvider>,
    );

    expect(screen.getByText('Ayesha')).toBeInTheDocument();
  });

  it('is null, not an error, when nobody is signed in', () => {
    render(
      <SessionProvider user={null}>
        <Who />
      </SessionProvider>,
    );

    expect(screen.getByText('nobody')).toBeInTheDocument();
  });

  it('throws when there is no boundary above it, rather than rendering a signed-out app', () => {
    // A missing provider and a signed-out learner must not look the same: the
    // first is a wiring bug that would hide every authenticated UI in the tree.
    expect(() => render(<Who />)).toThrow('useSession() was called outside <SessionBoundary>');
  });
});
