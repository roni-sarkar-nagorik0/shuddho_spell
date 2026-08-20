'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactElement, type ReactNode } from 'react';
import { createQueryClient } from './query-client';

/**
 * Mounted once in the root layout.
 *
 * `useState` with an initialiser rather than `useMemo`: this has to be created
 * exactly once for the life of the tree, and `useMemo` is explicitly allowed to
 * throw its value away and recompute. A discarded query client is every
 * in-flight request cancelled and every cached page refetched.
 */
export function QueryProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [client] = useState(createQueryClient);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
