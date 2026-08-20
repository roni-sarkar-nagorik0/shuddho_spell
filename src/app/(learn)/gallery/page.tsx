import { notFound } from 'next/navigation';
import { type ReactElement, type ReactNode } from 'react';
import { PhonemeStrip, type IPhonemeCell } from '@/components/learning/phoneme-strip';
import { serverEnv } from '@/lib/env.server';

/**
 * The component gallery — every state of every shared component, on one page.
 *
 * **This is not Storybook.** `13-frontend.md` asks for Storybook and this is a
 * deliberate substitution, recorded in `ARCHITECTURE.md`: Storybook is a second
 * build, a second bundler config and roughly fifty devDependencies to render
 * components this application can already render, and the states below are the
 * same three states a story file would have declared. What it costs is
 * Storybook's controls panel and its published static site; what it buys is one
 * build, one dependency tree, and states that cannot compile here and fail
 * there.
 *
 * It 404s in production. A gallery is documentation for whoever is building the
 * screens, not a route a learner should ever reach.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function State({
  children,
  name,
  note,
}: {
  readonly children: ReactNode;
  readonly name: string;
  readonly note: string;
}): ReactElement {
  return (
    <div className="card p-4">
      <p className="label">{name}</p>
      <p className="mt-1 text-muted">{note}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** `subtle` — the silent-b word Day 8 is built around. Real IPA, real Bangla. */
const SUBTLE: readonly IPhonemeCell[] = [
  { symbol: 's', isStressed: true, syllable: 0, accuracy: 0.94, attempts: 18 },
  { symbol: 'ʌ', isStressed: false, syllable: 0, accuracy: 0.71, attempts: 14 },
  { symbol: 't', isStressed: false, syllable: 1, accuracy: 0.88, attempts: 12 },
  { symbol: 'l', isStressed: false, syllable: 1, accuracy: 0.45, attempts: 11 },
];

const SUBTLE_UNSEEN: readonly IPhonemeCell[] = SUBTLE.map((cell) => ({
  ...cell,
  accuracy: null,
  attempts: 0,
}));

const SUBTLE_WEAK: readonly IPhonemeCell[] = SUBTLE.map((cell) => ({
  ...cell,
  accuracy: Math.max(0, (cell.accuracy ?? 0) - 0.5),
}));

export default function GalleryPage(): ReactElement {
  if (serverEnv.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <section className="col-span-12 flex flex-col gap-8">
      <header>
        <h1 className="font-display text-xl tracking-tight">Component gallery</h1>
        <p className="mt-1 text-muted">
          Every shared component in three states. Not a learner route — 404 in production.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base tracking-tight">PhonemeStrip</h2>
        <div className="grid grid-cols-3 gap-4">
          <State name="Mixed mastery" note="One weak sound, the rest solid.">
            <PhonemeStrip bangla="সাট্‌ল্" cells={SUBTLE} syllables={['sub', 'tle']} />
          </State>
          <State name="Never attempted" note="Dashed borders, no accuracy, no Bangla line.">
            <PhonemeStrip bangla={null} cells={SUBTLE_UNSEEN} syllables={['sub', 'tle']} />
          </State>
          <State name="Weak across the word" note="Every sound below the drill threshold.">
            <PhonemeStrip bangla="সাট্‌ল্" cells={SUBTLE_WEAK} syllables={['sub', 'tle']} />
          </State>
        </div>
      </section>
    </section>
  );
}
