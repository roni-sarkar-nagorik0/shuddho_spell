import { type ReactElement, type ReactNode } from 'react';
import { AudioProvider } from '@/components/lesson/audio-manager';
import { readAudioPreferences } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';

/**
 * Focus mode — the lesson, and nothing else.
 *
 * No rail, no breadcrumb, no notification bell. `13-frontend.md` calls the
 * lesson "focus mode" and the point of it is that there is nowhere to click
 * except forward: a learner three minutes into dictation should not be one
 * stray glance away from the library.
 *
 * `requireUser()` here as well as in the page, for the reason the learn layout
 * gives — Next renders layouts and pages in parallel, so a layout that trusted
 * its child to authenticate would paint before anything checked.
 *
 * The audio manager is mounted here rather than inside the runtime so that one
 * provider spans every stage: moving from Dictate to Speak must not build a
 * second speaker that knows nothing about the utterance the first one left
 * running.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function FocusLayout({
  children,
}: {
  readonly children: ReactNode;
}): Promise<ReactElement> {
  const user = await requireUser();
  const preferences = await readAudioPreferences(user.userId);

  return (
    <AudioProvider preferences={preferences}>
      <div className="min-h-screen bg-neutral-50">{children}</div>
    </AudioProvider>
  );
}
