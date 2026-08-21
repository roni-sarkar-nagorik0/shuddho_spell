'use client';

import { useState, type ReactElement } from 'react';
import { ALPHABET, LETTERS_BANGLA_LACKS, type IAlphabetLetter } from './alphabet';
import { useSpeech } from '@/lib/audio/use-speech';
import { SENTENCE_RATE } from '@/lib/audio/voices';

/** British, and only British — the same reference accent the demo above speaks. */
const LANG = 'en-GB';

/**
 * A to Z, out loud.
 *
 * The page under this used to open on a table of eight misspellings, which is a
 * fair description of the problem and a poor invitation: there is nothing to
 * do, and a visitor learns what the course is about without ever hearing it.
 * Twenty-six letters they can press is the smallest possible thing that is both
 * — every one of them is a second of the actual product.
 *
 * It is also the honest place to start. A learner who cannot say the name of
 * *W* cannot take dictation, spell a word aloud, or read back a certificate
 * code — and six of the twenty-six carry a sound Bangla does not have at all.
 * Those six are marked on the grid itself rather than listed underneath, so the
 * shape of the problem is visible before anything is clicked.
 *
 * One letter is open at a time. A grid that expanded twenty-six panels would be
 * a page of text; this is a grid with an answer under it.
 */
export function AlphabetStrip(): ReactElement {
  const [open, setOpen] = useState<IAlphabetLetter | null>(null);
  const { supported, say } = useSpeech();

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {ALPHABET.map((entry) => {
          const selected = open?.letter === entry.letter;

          return (
            <button
              aria-label={`${entry.letter} — hear it and see how it is said`}
              aria-pressed={selected}
              className={[
                'flex h-11 w-11 flex-col items-center justify-center rounded-control border font-display text-lg leading-none transition-colors',
                selected
                  ? 'border-primary-900 bg-primary-900 text-surface'
                  : 'border-hairline bg-surface text-primary-900 hover:border-primary-900',
              ].join(' ')}
              key={entry.letter}
              onClick={() => {
                setOpen(entry);
                say(entry.letter, SENTENCE_RATE, LANG);
              }}
              type="button"
            >
              {entry.letter}
              {/*
                The mark, not a colour. Six letters are the ones that matter
                most and colour alone would not say so to a visitor who cannot
                see it — the dot has a text alternative in the button's label
                below, and the legend names it.
              */}
              <span
                aria-hidden
                className={[
                  'mt-0.5 h-1 w-1 rounded-full',
                  entry.substitution === null
                    ? 'bg-transparent'
                    : selected
                      ? 'bg-secondary-500'
                      : 'bg-tertiary-500',
                ].join(' ')}
              />
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted">
        <span aria-hidden className="mr-1.5 inline-block h-1 w-1 rounded-full bg-tertiary-500 align-middle" />
        {LETTERS_BANGLA_LACKS} of the 26 spell a sound Bangla does not have.
        {!supported && ' This browser has no speech synthesis — the transcriptions below still work.'}
      </p>

      {/*
        Rendered only once something is open, and it is not pre-opened on A.
        A panel that is already showing before the visitor touches anything
        teaches them that pressing a letter does nothing.
      */}
      {open !== null && <LetterDetail entry={open} />}
    </div>
  );
}

function LetterDetail({ entry }: { readonly entry: IAlphabetLetter }): ReactElement {
  return (
    <div
      aria-live="polite"
      className="mt-4 rounded-card border border-hairline bg-surface p-4"
      // Keyed by the letter so a screen reader announces the whole panel again
      // when a different letter is pressed, rather than reading a diff.
      key={entry.letter}
    >
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="font-display text-3xl leading-none tracking-tight text-primary-900">
          {entry.letter}
        </p>

        <p>
          <span className="label mr-2">Its name</span>
          <span className="num">/{entry.nameIpa}/</span>
          <span className="font-bengali ml-2" lang="bn">
            {entry.nameBangla}
          </span>
        </p>

        <p>
          <span className="label mr-2">The sound it spells</span>
          <span className="num">/{entry.sound}/</span>
        </p>
      </div>

      {entry.substitution !== null && (
        <p className="mt-3 max-w-2xl text-muted">
          <span className="label mr-2 text-tertiary-700">What happens instead</span>
          {entry.substitution}
        </p>
      )}
    </div>
  );
}
