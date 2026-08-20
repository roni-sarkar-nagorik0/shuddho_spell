'use client';

import { type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { useAudio } from '@/components/lesson/audio-manager';
import { PhonemeStrip, type IPhonemeCell } from '@/components/learning/phoneme-strip';
import { StatusBadge } from '@/components/primitives/status-badge';

export interface ILearnWord {
  readonly wordId: string;
  readonly text: string;
  readonly ipa: string;
  readonly syllables: readonly string[];
  readonly banglaSound: string;
  readonly banglaMeaning: string;
  readonly partOfSpeech: string;
  readonly cells: readonly IPhonemeCell[];
}

export interface ILearnStageProps {
  readonly words: readonly ILearnWord[];
  readonly rules: readonly {
    readonly id: string;
    readonly code: string;
    readonly statement: string;
    readonly examples: readonly string[];
    readonly counterexamples: readonly string[];
  }[];
  readonly onDone: () => void;
}

/**
 * Stage two: meet the words before spelling them.
 *
 * Each word gets the real `PhonemeStrip` — syllable dividers, 22px cells tinted
 * by **this learner's** mastery of each sound, the Bangla line, the mono stat
 * line. The strip's data comes from the server: `GetPhonemeStrips` resolves the
 * transcription against the 44-phoneme inventory and joins the learner's
 * mastery rows, four batched queries for the whole day.
 *
 * Audio goes through the shared manager (F11.8), which cancels before it
 * speaks and carries the learner's own accent and playback rate. This stage
 * holds no `SpeechSynthesisUtterance` of its own, and neither does any other:
 * one speaker means one thing can be talking.
 */
export function LearnStage({ words, rules, onDone }: ILearnStageProps): ReactElement {
  const audio = useAudio();

  return (
    <div className="flex flex-col gap-6">
      {!audio.supported && (
        <p className="text-muted">
          This browser has no speech synthesis. The transcription and the Bangla line still carry
          the pronunciation.
        </p>
      )}

      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {words.map((word) => (
          <li className="card flex flex-col gap-3 p-4" key={word.wordId}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <PhonemeStrip
                  bangla={word.banglaSound === '' ? null : word.banglaSound}
                  cells={word.cells}
                  syllables={word.syllables.length === 0 ? [word.text] : word.syllables}
                />
              </div>

              <button
                aria-label={`Play ${word.text}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary-900 text-primary-900"
                onClick={() => { audio.speak(word.text); }}
                type="button"
              >
                <Glyph name="play" size={14} />
              </button>
            </div>

            <p className="flex flex-wrap items-baseline gap-2">
              <span className="font-bengali" lang="bn">
                {word.banglaMeaning}
              </span>
              <span className="label">{word.partOfSpeech}</span>
              {audio.speaking === word.text && <StatusBadge label="Playing" tone="active" />}
            </p>
          </li>
        ))}
      </ul>

      {rules.length > 0 && (
        <section className="card">
          <div className="flex h-10 items-center border-b border-hairline px-3">
            <h2 className="font-display text-sm tracking-tight text-primary-900">
              Today&apos;s rules
            </h2>
          </div>
          <ul className="flex flex-col">
            {rules.map((rule) => (
              <li className="border-b border-hairline p-3 last:border-b-0" key={rule.id}>
                <p className="font-medium text-primary-900">{rule.statement}</p>
                <p className="mt-1 text-muted">
                  <span className="label mr-1">Works</span>
                  {rule.examples.join(' · ')}
                </p>
                {/*
                  The counterexamples are the half that matters. A rule with no
                  exception teaches a false absolute, and English spelling is
                  very largely made of exceptions.
                */}
                <p className="mt-1 text-tertiary-700">
                  <span className="label mr-1">Does not</span>
                  {rule.counterexamples.join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <button
          className="h-9 rounded-control bg-primary-900 px-4 text-surface"
          onClick={onDone}
          type="button"
        >
          Continue to dictation
        </button>
      </div>
    </div>
  );
}
