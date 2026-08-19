import 'server-only';
import { type ReactElement, type ReactNode } from 'react';
import { readUser } from './current-user';
import { MissingProfileError } from './missing-profile-error';
import { SessionProvider } from './session-context';

interface ISessionBoundaryProps {
  readonly children: ReactNode;
}

/**
 * The one place the server hands the client its identity.
 *
 * It is not a fourth way to read the user: nothing can call it for an answer,
 * it only renders one into the tree for `useSession()`. Mounted once, in the
 * root layout, so a Client Component anywhere can ask — and so no later layout
 * has to remember to mount it.
 *
 * A session with no profile behind it is swallowed here, and only here. This
 * decides what the interface shows, and an interface cannot show a learner it
 * cannot name, so it shows nobody. The gates stay loud: `requireUser()` throws
 * on the same state, and it is what guards every page that matters. Taking the
 * public pages down as well — including `/login`, the one screen that could
 * plausibly help — would turn a rare inconsistency into a locked door.
 */
export async function SessionBoundary({ children }: ISessionBoundaryProps): Promise<ReactElement> {
  const user = await readUser().catch((caught: unknown) => {
    if (caught instanceof MissingProfileError) {
      return null;
    }
    throw caught;
  });

  return <SessionProvider user={user}>{children}</SessionProvider>;
}
