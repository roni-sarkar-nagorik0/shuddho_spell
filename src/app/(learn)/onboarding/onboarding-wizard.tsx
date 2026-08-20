'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/cn';

const stateSchema = z.object({
  completed: z.boolean(),
  track: z.enum(['standard28', 'sprint21']),
  dailyMinutes: z.number(),
  accentPreference: z.enum(['british', 'american']),
  currentDayIndex: z.number(),
});

type OnboardingState = z.infer<typeof stateSchema>;

const DRAFT_KEY = 'shuddhospell.onboarding-draft';

const STEPS = Object.freeze(['goal', 'minutes', 'track', 'reminder', 'diagnostic'] as const);

type Step = (typeof STEPS)[number];

const STEP_TITLES: Readonly<Record<Step, string>> = {
  goal: 'What are you here for?',
  minutes: 'How long each day?',
  track: 'How fast?',
  reminder: 'When should we remind you?',
  diagnostic: 'One last thing',
};

interface IDraft {
  readonly step: Step;
  readonly goal: string;
  readonly dailyMinutes: number;
  readonly track: 'standard28' | 'sprint21';
  readonly accentPreference: 'british' | 'american';
  readonly reminderTime: string;
}

const BLANK: IDraft = {
  step: 'goal',
  goal: '',
  dailyMinutes: 25,
  track: 'standard28',
  accentPreference: 'british',
  reminderTime: '20:00',
};

const GOALS: readonly { readonly id: string; readonly label: string; readonly note: string }[] = [
  { id: 'work', label: 'Work', note: 'Emails, documents and meetings that have to be right.' },
  { id: 'study', label: 'Study', note: 'Exams, applications and academic writing.' },
  { id: 'exams', label: 'IELTS or similar', note: 'A test with a marking scheme behind it.' },
  { id: 'confidence', label: 'Confidence', note: 'To stop second-guessing every sentence.' },
];

/**
 * Goal, minutes, track, reminder, diagnostic — and **resumable at every step**.
 *
 * The draft lives in `localStorage` and the committed answers live on the
 * server. That split is deliberate: half-made choices are not worth a database
 * row and would need cleaning up, while the choices that matter are read back
 * from the profile on mount, so a learner who abandons the wizard and returns a
 * week later on another device resumes from what was actually saved rather than
 * from nothing.
 *
 * A learner who has already onboarded is sent to the dashboard. The use case
 * refuses to rewrite their track anyway; this stops them being asked a question
 * whose answer would be discarded.
 *
 * The reminder time is written through the notification preferences endpoint,
 * not through onboarding, because that is where the field lives. One fact, one
 * home — even when it costs the wizard a second request.
 */
export function OnboardingWizard(): ReactElement {
  const [draft, setDraft] = useState<IDraft>(BLANK);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = window.localStorage.getItem(DRAFT_KEY);

    if (stored !== null) {
      try {
        setDraft({ ...BLANK, ...(JSON.parse(stored) as Partial<IDraft>) });
      } catch {
        // A corrupt draft is not worth an error message. Start clean.
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }

    void apiFetch('/api/v1/onboarding', { schema: stateSchema })
      .then((current) => {
        setState(current);

        if (current.completed) {
          router.replace('/dashboard');
          return;
        }

        // Anything already stored on the profile beats the local draft.
        setDraft((existing) => ({
          ...existing,
          dailyMinutes: current.dailyMinutes,
          track: current.track,
          accentPreference: current.accentPreference,
        }));
      })
      .catch(() => { setError('Your profile could not be read. Try reloading.'); });
  }, [router]);

  const update = useCallback((patch: Partial<IDraft>) => {
    setDraft((existing) => {
      const next = { ...existing, ...patch };
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const stepIndex = STEPS.indexOf(draft.step);

  const go = (delta: number): void => {
    const next = STEPS[Math.min(STEPS.length - 1, Math.max(0, stepIndex + delta))];

    if (next !== undefined) {
      update({ step: next });
    }
  };

  const finish = (): void => {
    setSaving(true);
    setError(null);

    void apiFetch('/api/v1/onboarding', {
      method: 'POST',
      schema: stateSchema,
      body: {
        track: draft.track,
        dailyMinutes: draft.dailyMinutes,
        accentPreference: draft.accentPreference,
      },
    })
      .then(async () =>
        // The reminder goes to the endpoint that owns the field. A failure here
        // must not undo the onboarding that already succeeded, so it is caught
        // separately and swallowed — the learner can set it in settings.
        apiFetch('/api/v1/notifications/preferences', {
          method: 'PATCH',
          schema: z.unknown(),
          body: {
            updates: [
              {
                type: 'daily_reminder',
                channel: 'in_app',
                enabled: true,
                quietHoursStart: null,
                quietHoursEnd: null,
                reminderTime: draft.reminderTime,
              },
            ],
          },
        }).catch(() => undefined),
      )
      .then(() => {
        window.localStorage.removeItem(DRAFT_KEY);
        router.push('/exams/diagnostic');
      })
      .catch(() => {
        setError('That could not be saved. Nothing was lost — try again.');
        setSaving(false);
      });
  };

  if (state === null && error === null) {
    return <p className="text-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-wrap items-center gap-1" aria-label="Onboarding steps">
        {STEPS.map((step, index) => (
          <li className="flex items-center gap-1" key={step}>
            {index > 0 && <span aria-hidden="true" className="h-px w-4 bg-hairline" />}
            <span
              aria-current={step === draft.step ? 'step' : undefined}
              className={cn(
                'rounded-control px-2 py-1 text-[11px]',
                step === draft.step && 'bg-primary-900 text-surface',
                index < stepIndex && 'bg-primary-100 text-primary-900',
                index > stepIndex && 'text-cold',
              )}
            >
              {index + 1}. {STEP_TITLES[step]}
              <span className="sr-only">
                {index < stepIndex ? ' — done' : step === draft.step ? ' — current' : ' — not started'}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <h2 className="font-display text-2xl tracking-tight text-primary-900">
        {STEP_TITLES[draft.step]}
      </h2>

      {draft.step === 'goal' && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {GOALS.map((goal) => (
            <li key={goal.id}>
              <button
                aria-pressed={draft.goal === goal.id}
                className={cn(
                  'w-full rounded-card border p-4 text-left',
                  draft.goal === goal.id ? 'border-primary-900 bg-primary-50' : 'border-hairline bg-surface',
                )}
                onClick={() => { update({ goal: goal.id }); }}
                type="button"
              >
                <span className="font-medium text-primary-900">{goal.label}</span>
                <span className="mt-1 block text-muted">{goal.note}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {draft.step === 'minutes' && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2" htmlFor="minutes">
            <span className="label">Minutes a day</span>
            <input
              className="w-64"
              id="minutes"
              max={120}
              min={5}
              onChange={(event) => { update({ dailyMinutes: Number(event.target.value) }); }}
              step={5}
              type="range"
              value={draft.dailyMinutes}
            />
          </label>
          <p className="num text-2xl text-primary-900">{draft.dailyMinutes} min</p>
          <p className="text-muted">
            A day is five stages. Twenty-five minutes is the design; less than fifteen and the
            review queue outgrows the session.
          </p>
        </div>
      )}

      {draft.step === 'track' && (
        <div className="flex flex-col gap-3">
          {(
            [
              { id: 'standard28', label: '28 days', note: 'The standard programme. Four weeks, four exams.' },
              { id: 'sprint21', label: '21 days', note: 'The same material, compressed. Longer sessions, less spacing.' },
            ] as const
          ).map((option) => (
            <button
              aria-pressed={draft.track === option.id}
              className={cn(
                'rounded-card border p-4 text-left',
                draft.track === option.id ? 'border-primary-900 bg-primary-50' : 'border-hairline bg-surface',
              )}
              key={option.id}
              onClick={() => { update({ track: option.id }); }}
              type="button"
            >
              <span className="font-medium text-primary-900">{option.label}</span>
              <span className="mt-1 block text-muted">{option.note}</span>
            </button>
          ))}

          <fieldset className="mt-2">
            <legend className="label">Accent to train towards</legend>
            <div className="mt-2 flex gap-4">
              {(['british', 'american'] as const).map((accent) => (
                <label className="flex items-center gap-2" key={accent}>
                  <input
                    checked={draft.accentPreference === accent}
                    name="accent"
                    onChange={() => { update({ accentPreference: accent }); }}
                    type="radio"
                  />
                  {accent === 'british' ? 'British' : 'American'}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {draft.step === 'reminder' && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2" htmlFor="reminder">
            <span className="label">Reminder time</span>
            <input
              className="h-9 w-32 rounded-control border border-hairline px-2"
              id="reminder"
              onChange={(event) => { update({ reminderTime: event.target.value }); }}
              type="time"
              value={draft.reminderTime}
            />
          </label>
          <p className="text-muted">
            In your own timezone. One reminder a day, and it stops arriving once you have finished
            that day&apos;s session.
          </p>
        </div>
      )}

      {draft.step === 'diagnostic' && (
        <div className="flex flex-col gap-3">
          <p>
            The diagnostic is twenty minutes and thirty questions. It is not graded and you cannot
            fail it — it decides which day of the programme you start on, so that you are not spending
            a week on spellings you already have.
          </p>
          <p className="text-muted">
            You can skip it and start at day one. Nothing later depends on having sat it.
          </p>
          {error !== null && <p className="text-tertiary-500">{error}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="h-9 rounded-control border border-primary-900 px-3 text-primary-900 disabled:border-cold disabled:text-cold"
          disabled={stepIndex === 0 || saving}
          onClick={() => { go(-1); }}
          type="button"
        >
          Back
        </button>

        {draft.step === 'diagnostic' ? (
          <button
            className="h-9 rounded-control bg-primary-900 px-4 text-surface disabled:bg-cold"
            disabled={saving}
            onClick={finish}
            type="button"
          >
            {saving ? 'Saving…' : 'Save and take the diagnostic'}
          </button>
        ) : (
          <button
            className="h-9 rounded-control bg-primary-900 px-4 text-surface disabled:bg-cold"
            disabled={draft.step === 'goal' && draft.goal === ''}
            onClick={() => { go(1); }}
            type="button"
          >
            Continue
          </button>
        )}

        <span className="num ml-auto text-[11px] text-muted">
          step {stepIndex + 1} of {STEPS.length} · your answers are kept if you leave
        </span>
      </div>
    </div>
  );
}
