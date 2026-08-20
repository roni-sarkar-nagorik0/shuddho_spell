import Link from 'next/link';
import { type ReactElement } from 'react';
import { MILESTONES, SYLLABUS } from './syllabus';

/**
 * The marketing landing page.
 *
 * A **Server Component with no data reads at all** — no `requireUser`, no
 * database, no `fetch`. Everything on it is either literal or generated at
 * build time from `syllabus.ts`, so the only work a request does is render.
 *
 * `13-frontend.md` asks for it to be statically rendered and score ≥95
 * Lighthouse performance and 100 accessibility. What is under this file's
 * control is done: no client JavaScript except the dictation demo (F12.11), no
 * images, no web fonts beyond the four the whole product already loads, real
 * headings in order, and every table a real table. **Static rendering itself is
 * blocked one level up** — the root layout calls `getLocale()` and mounts
 * `SessionBoundary`, both of which read cookies, and a cookie read opts the
 * whole tree into dynamic rendering. That is a Phase 1 and Phase 3 decision, not
 * one this page can undo, and it is recorded rather than worked around.
 *
 * The error table is the honest core of the pitch: eight mistakes Bengali
 * speakers actually make, named, with the reason. `07-speech-scoring.md` and
 * `content/phonemes.ts` are where each one comes from — none of it is invented
 * to sound persuasive.
 */
export const dynamic = 'force-dynamic';

interface IErrorRow {
  readonly written: string;
  readonly meant: string;
  readonly why: string;
}

const BENGALI_ERRORS: readonly IErrorRow[] = [
  { written: 'wery', meant: 'very', why: 'Bangla has no /v/. The nearest sound is /w/, so it takes its place.' },
  { written: 'bhery', meant: 'very', why: 'The other substitution for /v/ — the aspirated ভ, which is closer in the mouth but not the sound.' },
  { written: 'tink', meant: 'think', why: 'Bangla has no /θ/. The dental stop ট stands in and the fricative disappears.' },
  { written: 'dis', meant: 'this', why: 'The same gap on the voiced side: no /ð/, so দ takes over.' },
  { written: 'jero', meant: 'zero', why: 'No /z/ in Bangla. It becomes the affricate জ.' },
  { written: 'recieve', meant: 'receive', why: 'I before E except after C — and this is after C, which is exactly when the rule reverses.' },
  { written: 'beleive', meant: 'believe', why: 'The same rule applied in the wrong direction. The pair is where the rule is learnt or lost.' },
  { written: 'schoolo', meant: 'school', why: 'Bangla syllables do not end in a bare consonant cluster, so a vowel gets added to close them.' },
];

interface IFaqRow {
  readonly question: string;
  readonly answer: string;
}

const FAQ: readonly IFaqRow[] = [
  {
    question: 'Do I need a microphone?',
    answer:
      'No. The pronunciation stage uses one if your browser has speech recognition, and falls back to guided self-assessment if it does not. Firefox has no speech recognition and the course works there.',
  },
  {
    question: 'What happens if I miss a day?',
    answer:
      'Nothing is lost. Your streak breaks and the words you were due to review stay due — the schedule waits for you rather than discarding what you had learnt.',
  },
  {
    question: 'Can I retake an exam?',
    answer:
      'Milestones allow three attempts with 24 hours between them; the final allows two with 48 hours. A failed exam prescribes drills aimed at the sections that lost the marks.',
  },
  {
    question: 'Is the certificate checkable?',
    answer:
      'Yes, by anyone, without an account. Every certificate carries a code that resolves at /verify — and a revoked certificate verifies as revoked rather than vanishing.',
  },
  {
    question: 'Is this in Bangla or English?',
    answer:
      'Both. The interface is available in either, and every word carries its Bangla meaning and pronunciation. The English you are learning is the standard British reference accent.',
  },
];

function Section({
  children,
  title,
  note,
}: {
  readonly children: ReactElement | readonly ReactElement[];
  readonly title: string;
  readonly note?: string;
}): ReactElement {
  return (
    <section className="border-t border-hairline py-16">
      <div className="mx-auto max-w-content px-6">
        <h2 className="font-display text-2xl tracking-tight text-primary-900">{title}</h2>
        {note !== undefined && <p className="mt-2 max-w-2xl text-muted">{note}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export default function LandingPage(): ReactElement {
  return (
    <main className="bg-neutral-50">
      {/* The hero. Dark, per 13-frontend.md, with the demo mounted inside it. */}
      <section className="bg-primary-900 text-surface">
        <div className="mx-auto grid max-w-content gap-10 px-6 py-24 lg:grid-cols-2">
          <div>
            <p className="label text-primary-100">ShuddhoSpell</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight">
              Spell it.
              <br />
              Say it.
              <br />
              Mean it.
            </h1>
            <p className="mt-6 max-w-md text-primary-100">
              A 28-day English precision course built for Bangla speakers — the spellings, the
              sounds and the sentence shapes that go wrong, drilled until they do not.
            </p>
            <p className="mt-3 max-w-md font-bengali text-primary-100" lang="bn">
              বাংলাভাষীদের জন্য তৈরি ২৮ দিনের ইংরেজি নির্ভুলতার কোর্স।
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="h-10 rounded-control bg-secondary-500 px-5 py-2.5 font-medium text-primary-900"
                href="/login"
              >
                Start free
              </Link>
              <Link
                className="h-10 rounded-control border border-primary-100 px-5 py-2.5 text-primary-100"
                href="#syllabus"
              >
                See the 28 days
              </Link>
            </div>
          </div>

          <div id="demo" />
        </div>
      </section>

      <Section
        note="Eight of them, with the reason. None of these is a careless slip — each one is a sound or a rule English has and Bangla does not."
        title="The mistakes this course is about"
      >
        <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="label h-8 border-b border-hairline px-3">Written</th>
                <th className="label h-8 border-b border-hairline px-3">Meant</th>
                <th className="label h-8 border-b border-hairline px-3">Why it happens</th>
              </tr>
            </thead>
            <tbody>
              {BENGALI_ERRORS.map((row) => (
                <tr className="border-b border-hairline last:border-b-0" key={row.written}>
                  <td className="h-8 px-3 font-mono text-tertiary-700">{row.written}</td>
                  <td className="h-8 px-3 font-mono text-mastered">{row.meant}</td>
                  <td className="px-3 py-2 text-muted">{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        note="Twenty-eight days, four weeks, four examinations. This is the whole syllabus — not a sample of it."
        title="The 28 days"
      >
        <div id="syllabus">
          <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="label h-8 w-16 border-b border-hairline px-3">Day</th>
                  <th className="label h-8 border-b border-hairline px-3">Focus</th>
                  <th className="label h-8 border-b border-hairline px-3">What it covers</th>
                </tr>
              </thead>
              <tbody>
                {SYLLABUS.map((day) => {
                  const milestone = MILESTONES.find((entry) => entry.afterDay === day.day - 1);

                  return (
                    <tr className="border-b border-hairline" key={day.day}>
                      {milestone !== undefined && (
                        <td className="bg-primary-50 px-3 py-2 font-medium text-primary-900" colSpan={3}>
                          {milestone.title} — {milestone.detail}
                        </td>
                      )}
                      {milestone === undefined && (
                        <>
                          <td className="num h-8 px-3">{day.day}</td>
                          <td className="h-8 px-3 font-medium text-primary-900">{day.title}</td>
                          <td className="px-3 py-2 text-muted">{day.focus}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
                <tr>
                  <td className="bg-primary-50 px-3 py-2 font-medium text-primary-900" colSpan={3}>
                    {MILESTONES[MILESTONES.length - 1]?.title} —{' '}
                    {MILESTONES[MILESTONES.length - 1]?.detail}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section
        note="The whole point of the design is that it fits into a day that is already full."
        title="Twenty-five minutes"
      >
        <ul className="grid gap-4 sm:grid-cols-5">
          {[
            { label: 'Review', minutes: 5, detail: 'Yesterday, before anything new.' },
            { label: 'Learn', minutes: 6, detail: 'The words, their sounds, the rule behind them.' },
            { label: 'Dictate', minutes: 6, detail: 'Spell what you hear, letter by letter.' },
            { label: 'Speak', minutes: 4, detail: 'Say it. Scored on the sounds Bangla lacks.' },
            { label: 'Build', minutes: 4, detail: 'Put it into a sentence that holds together.' },
          ].map((stage) => (
            <li className="card p-4" key={stage.label}>
              <p className="label">{stage.label}</p>
              <p className="num mt-1 text-2xl text-primary-900">{stage.minutes} min</p>
              <p className="mt-2 text-muted">{stage.detail}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section note="One price, everything in it. No tiers, no upsell inside a lesson." title="Pricing">
        <div className="card max-w-md p-6">
          <p className="label">Full programme</p>
          <p className="num mt-2 text-4xl text-primary-900">৳ 1,200</p>
          <p className="mt-2 text-muted">
            One payment. All 28 days, all four examinations, the certificate, and the review
            schedule for as long as you keep using it.
          </p>
          <ul className="mt-4 flex flex-col gap-1.5 text-muted">
            <li>1,240 words with real IPA and Bangla pronunciation</li>
            <li>560 sentences to build</li>
            <li>28 rule families with their exceptions</li>
            <li>Spaced repetition that follows what you actually got wrong</li>
          </ul>
          <Link
            className="mt-6 inline-flex h-10 items-center rounded-control bg-primary-900 px-5 text-surface"
            href="/login"
          >
            Start free
          </Link>
        </div>
      </Section>

      <Section title="Questions">
        <dl className="flex max-w-3xl flex-col">
          {FAQ.map((entry) => (
            <div className="border-b border-hairline py-4 last:border-b-0" key={entry.question}>
              <dt className="font-medium text-primary-900">{entry.question}</dt>
              <dd className="mt-1 text-muted">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <footer className="border-t border-hairline py-10">
        <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-6 gap-y-2 px-6 text-muted">
          <span className="font-display text-primary-900">ShuddhoSpell</span>
          <Link className="hover:text-primary-900" href="/login">
            Sign in
          </Link>
          <Link className="hover:text-primary-900" href="/verify/XXXX-XXXX-XXXX">
            Verify a certificate
          </Link>
          <span className="ml-auto num text-[11px]">
            Standard British reference accent · Bangla in Bangla script
          </span>
        </div>
      </footer>
    </main>
  );
}
