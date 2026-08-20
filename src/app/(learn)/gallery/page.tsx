import { notFound } from 'next/navigation';
import { type ReactElement, type ReactNode } from 'react';
import { MasteryMatrix } from '@/components/data/mastery-matrix';
import { PhonemeStrip, type IPhonemeCell } from '@/components/learning/phoneme-strip';
import { serverEnv } from '@/lib/env.server';
import { PHONEME_CELLS, RULE_FAMILY_CELLS, UNATTEMPTED_PHONEME_CELLS } from './fixtures';
import { HeatCell } from '@/components/primitives/heat-cell';
import { MonoValue } from '@/components/primitives/mono-value';
import { PanelHeader } from '@/components/primitives/panel-header';
import { Sparkline } from '@/components/primitives/sparkline';
import { StatCell } from '@/components/primitives/stat-cell';
import { StatusBadge, STATUS_TONES } from '@/components/primitives/status-badge';
import { ConfirmDemo, DrawerDemo, PopoverDemo, ToastDemo } from './overlays-demo';
import { TableDemo } from './table-demo';

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

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base tracking-tight">MasteryMatrix</h2>
        <div className="grid grid-cols-2 gap-4">
          <State name="Phoneme — 44 cells" note={'dimension="phoneme", 11 columns.'}>
            <MasteryMatrix cells={PHONEME_CELLS} dimension="phoneme" drillLabel="Drill this" />
          </State>
          <State name="Rule family — 24 cells" note={'Same component, dimension="rule_family", 6 columns.'}>
            <MasteryMatrix
              cells={RULE_FAMILY_CELLS}
              dimension="rule_family"
              drillLabel="Drill this"
            />
          </State>
          <State name="Day one" note="44 cells, nothing attempted — dashed, not merely pale.">
            <MasteryMatrix
              cells={UNATTEMPTED_PHONEME_CELLS}
              dimension="phoneme"
              drillLabel="Drill this"
            />
          </State>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base tracking-tight">DataTable</h2>
        <div className="flex flex-col gap-4">
          <State name="Two cursor pages" note="Pinned first column, sticky header, 32px rows.">
            <TableDemo state="loaded" />
          </State>
          <State name="Empty" note="A sentence, not an illustration.">
            <TableDemo state="empty" />
          </State>
          <State name="Loading" note="Both pagination controls disabled.">
            <TableDemo state="loading" />
          </State>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base tracking-tight">Primitives</h2>
        <div className="grid grid-cols-3 gap-4">
          <State name="StatCell — rising" note="Arrow, sign and colour. Never colour alone.">
            <StatCell delta={4} label="Accuracy" note="up 4 since Monday" unit="%" value={92} />
          </State>
          <State name="StatCell — falling" note="Same primitive, tertiary-500.">
            <StatCell delta={-3} label="Streak" note="broken on Sunday" unit="days" value={11} />
          </State>
          <State name="StatCell — no comparison" note="delta null: nothing to compare yet.">
            <StatCell delta={null} label="Words learned" value={128} />
          </State>

          <State name="MonoValue" note="Three sizes, tabular figures throughout.">
            <span className="flex items-baseline gap-4">
              <MonoValue size="sm" unit="s" value={45} />
              <MonoValue unit="%" value="87" />
              <MonoValue size="lg" unit="×" value="1.2" />
            </span>
          </State>
          <State name="PanelHeader" note="Title, note, right-aligned action.">
            <div className="card">
              <PanelHeader
                action={<span className="text-[11px] text-primary-900">View all</span>}
                note="12 rows"
                title="Due reviews"
              />
              <p className="p-3 text-muted">Panel body.</p>
            </div>
          </State>
          <State name="HeatCell" note="Five steps plus the unattempted dashed square.">
            <span className="flex gap-1">
              <HeatCell accuracy={null} label="not seen">ə</HeatCell>
              <HeatCell accuracy={0.2} label="weak">θ</HeatCell>
              <HeatCell accuracy={0.5} label="shaky">ð</HeatCell>
              <HeatCell accuracy={0.8} label="good">v</HeatCell>
              <HeatCell accuracy={0.97} label="mastered">z</HeatCell>
            </span>
          </State>

          <State name="StatusBadge" note="Every tone carries its word.">
            <span className="flex flex-wrap gap-1.5">
              {STATUS_TONES.map((tone) => (
                <StatusBadge key={tone} label={tone} tone={tone} />
              ))}
            </span>
          </State>
          <State name="Sparkline — a trend" note="Last point dotted; no axes by design.">
            <Sparkline
              className="text-primary-900"
              label="Accuracy over the last nine sessions, rising from 61% to 92%"
              values={[61, 58, 66, 71, 69, 78, 84, 88, 92]}
            />
          </State>
          <State name="Sparkline — flat and empty" note="Zero span, and fewer than two points.">
            <span className="flex items-center gap-4">
              <Sparkline className="text-muted" label="Flat at 70%" values={[70, 70, 70, 70]} />
              <Sparkline className="text-muted" label="One session only" values={[70]} />
            </span>
          </State>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base tracking-tight">Overlays</h2>
        <p className="text-muted">
          All four: Escape closes, focus goes in on open and returns to the trigger on close. The
          three modal ones trap Tab; the popover deliberately does not.
        </p>
        <div className="grid grid-cols-4 gap-4">
          <State name="Popover" note="Non-modal. Tab-out and outside-click both dismiss.">
            <PopoverDemo />
          </State>
          <State name="Drawer" note="Modal, right side, motion-safe slide.">
            <DrawerDemo />
          </State>
          <State name="ConfirmDialog" note="Destructive. Cancel is focused, not Confirm.">
            <ConfirmDemo />
          </State>
          <State name="Toast" note="Three severities, each with its word beside the accent.">
            <ToastDemo />
          </State>
        </div>
      </section>
    </section>
  );
}
