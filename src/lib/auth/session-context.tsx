'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { type IAuthenticatedUser } from '@/contracts';

/**
 * `undefined` means "no provider above me", which is a wiring bug. `null` means
 * "a provider, and nobody is signed in", which is an ordinary Tuesday. Folding
 * the two together would turn a missing provider into a silent signed-out UI.
 */
const SessionContext = createContext<IAuthenticatedUser | null | undefined>(undefined);

interface ISessionProviderProps {
  readonly user: IAuthenticatedUser | null;
  readonly children: ReactNode;
}

/**
 * Fed by `SessionBoundary`, never by a client. The value crossed the wire from
 * a session the server verified; a Client Component cannot obtain it any other
 * way, because the session cookie is httpOnly (D21).
 */
export function SessionProvider({ user, children }: ISessionProviderProps): ReactElement {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/** The Client Component way in — the third and last of the three. */
export function useSession(): IAuthenticatedUser | null {
  const user = useContext(SessionContext);

  if (user === undefined) {
    throw new Error('useSession() was called outside <SessionBoundary>');
  }

  return user;
}
