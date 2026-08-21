'use client';

import { type ReactElement } from 'react';
import { LETTER_FAMILIES, substitutedIn, type ILetterFamily } from './letter-families';
import { useSpeech } from '@/lib/audio/use-speech';
import { SENTENCE_RATE } from '@/lib/audio/voices';

/** British, and only British — the same reference accent every other panel speaks. */
const LANG = 'en-GB';

/**
 * The letters that sound alike, grouped, and playable one family at a time.
 *
 * The strip above answers "how is this letter said". This answers the question
 * that actually costs a learner marks: **which letters am I going to confuse
 * with which**. Spelling a name over the phone, reading back a certificate
 * code, taking dictation — none of those fail one letter at a time. Eight of
 * the twenty-six rhyme on /iː/, and the whole difference between *B* and *V* is
 * one consonant in front of the same vowel.
 *
 * Hearing them **in a row** is the thing a page cannot say in words. A single
 * utterance with commas gives the engine its own pauses, so the family arrives
 * as a run rather than eight separate clicks — which is how they will arrive in
 * real life, and where the confusion actually happens.
 *
 * Nothing here is authored. The families are derived from the same twenty-six
 * entries the strip renders, and which members are marked comes from
 * `content/phonemes.ts`. If a letter's transcription is ever corrected, it
 * changes family on its own.
 */
export function AlphabetFamilies(): ReactElement {
  const { supported, say } = useSpeech();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {LETTER_FAMILIES.map((family) => (
        <Family family={family} key={family.nucleus} speak={say} supported={supported} />
      ))}
    </div>
  );
}

function Family({
  family,
  speak,
  supported,
}: {
  readonly family: ILetterFamily;
  readonly speak: (text: string, rate: number, lang: string) => void;
  readonly supported: boolean;
}): ReactElement {
  const marked = substitutedIn(family);
  const letters = family.letters.map((entry) => entry.letter);

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="num text-lg text-primary-900">/{family.nucleus}/</p>
        <p className="text-muted">
          rhymes with <span className="font-medium text-primary-900">{family.rhymesWith}</span>
        </p>
        <p className="label ml-auto">
          {family.letters.length === 1 ? 'on its own' : `${String(family.letters.length)} letters`}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {family.letters.map((entry) => (
          <button
            aria-label={`Hear the letter ${entry.letter}`}
            className={[
              'h-9 w-9 rounded-control border font-display text-base leading-none',
              entry.substitution === null
                ? 'border-hairline bg-surface text-primary-900 hover:border-primary-900'
                : 'border-tertiary-500 bg-tertiary-100 text-tertiary-700',
            ].join(' ')}
            key={entry.letter}
            onClick={() => {
              speak(entry.letter, SENTENCE_RATE, LANG);
            }}
            type="button"
          >
            {entry.letter}
          </button>
        ))}

        {/*
          Only where there is more than one, because "hear all one of them" is
          the play button that is already there.
        */}
        {supported && family.letters.length > 1 && (
          <button
            aria-label={`Hear all ${String(family.letters.length)} together`}
            className="h-9 rounded-control border border-primary-900 px-3 text-primary-900"
            onClick={() => {
              // Commas, so the engine puts its own pauses in. One utterance
              // rather than a queue of them: the run is the point, and a queue
              // would let a second click interleave two families.
              speak(letters.join(', '), SENTENCE_RATE, LANG);
            }}
            type="button"
          >
            Hear all {family.letters.length}
          </button>
        )}
      </div>

      {/*
        The sentence that makes the grouping worth reading. A family is a set of
        names that already sound alike; these are the members a Bengali speaker
        is *also* substituting, which is how a spelled-out word arrives wrong.
      */}
      {marked.length > 0 && (
        <p className="text-muted">
          <span className="label mr-2 text-tertiary-700">Watch</span>
          {marked.map((entry) => entry.letter).join(', ')} — {carriesBanglaGap(marked.length)}
        </p>
      )}
    </div>
  );
}

/**
 * One sentence or the other, chosen by count rather than written twice.
 *
 * "these 1 letters" is the kind of thing that ships because the plural was
 * never the case anyone looked at.
 */
function carriesBanglaGap(count: number): string {
  return count === 1
    ? 'the one sound in this group Bangla has no equivalent for, so the substitution lands on a name that already rhymes with the rest.'
    : `${String(count)} of these spell sounds Bangla has no equivalent for, so the substitution lands on names that already rhyme with the rest.`;
}
