'use client';

import { useEffect } from 'react';

/**
 * Two guards over one live attempt.
 *
 * **`beforeunload`** puts the browser's own confirmation in front of a reload,
 * a close or a typed-in URL. The message is not ours to choose — every browser
 * replaced custom text with a generic warning years ago — but the prompt is,
 * and its absence is the difference between "are you sure?" and a lost paper.
 *
 * **The back button** is caught by pushing a duplicate history entry and
 * re-pushing it on `popstate`. The learner stays on the exam. This is
 * deliberately a *nuisance* rather than a lock: nothing here can stop a
 * determined navigation, and nothing needs to — the server holds the deadline
 * and every saved answer, so leaving costs the learner time, never work.
 *
 * Both are removed the moment the attempt is no longer live, so the result
 * screen does not warn about leaving.
 */
export function useExamGuard(active: boolean): void {
  useEffect(() => {
    if (!active || typeof window === 'undefined') {
      return undefined;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      // `preventDefault()` alone. The old incantation was to also assign
      // `event.returnValue = ''`, which every browser honoured and every
      // browser has since deprecated — Chrome 119 and Safari 17 both trigger
      // the prompt from `preventDefault` on its own. Keeping the deprecated
      // assignment for browsers that predate them would mean silencing a lint
      // rule that is telling the truth.
      event.preventDefault();
    };

    const onPopState = (): void => {
      window.history.pushState(null, '', window.location.href);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
  }, [active]);
}
