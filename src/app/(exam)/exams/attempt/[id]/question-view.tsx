'use client';

import { type ReactElement } from 'react';
import { type ExamQuestionView } from '@/app/(learn)/exams/[code]/exam-contracts';

export interface IQuestionViewProps {
  readonly question: ExamQuestionView;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled: boolean;
}

/** What one question asks, in the shape this component renders. */
interface IAsked {
  /** What to do. One line, imperative. */
  readonly instruction: string;
  /** The thing being asked about, set in mono because it is a transcription. */
  readonly ipa?: string | undefined;
  /** The thing being asked about, set as words. */
  readonly text?: string | undefined;
  /** Bangla — a meaning to spell from, or a sentence to render into English. */
  readonly bangla?: string | undefined;
  /** A hint that narrows the answer without giving it. */
  readonly hint?: string | undefined;
  readonly label: string;
}

function read(payload: unknown, key: string): unknown {
  return typeof payload === 'object' && payload !== null ? Reflect.get(payload, key) : undefined;
}

function str(payload: unknown, key: string): string | undefined {
  const value = read(payload, key);

  return typeof value === 'string' && value !== '' ? value : undefined;
}

function num(payload: unknown, key: string): number | undefined {
  const value = read(payload, key);

  return typeof value === 'number' ? value : undefined;
}

/**
 * One question's payload, read as the question it is.
 *
 * `ExamCandidateBuilder` builds four shapes and they share almost no keys, so
 * this is a switch rather than a set of optional lookups. It returns `null` for
 * a type it does not know, which is what keeps the "missing its prompt" notice
 * below meaningful: it now fires for a genuinely unrenderable question instead
 * of for every question there is.
 *
 * **Nothing here reads an answer key, and there is none in the props to read.**
 * The dictation branch is where that matters most: the whole question is that
 * the learner does *not* have the spelling, so it renders the sounds, the
 * meaning and the length, and never `correctAnswer.text` — which the server
 * does not send in the first place (rule 3 of `08-exam-engine.md`).
 */
function asked(question: ExamQuestionView): IAsked | null {
  const payload = question.payload;

  switch (question.type) {
    case 'dictation': {
      const ipa = str(payload, 'ipa');
      const syllables = num(payload, 'syllableCount');

      if (ipa === undefined) {
        return null;
      }

      return {
        label: 'Dictation',
        instruction: 'Spell this word in English.',
        ipa,
        bangla: str(payload, 'banglaMeaning'),
        hint:
          syllables === undefined
            ? undefined
            : `${String(syllables)} syllable${syllables === 1 ? '' : 's'}`,
      };
    }

    case 'pronunciation': {
      const text = str(payload, 'text');

      if (text === undefined) {
        return null;
      }

      return {
        label: 'Pronunciation',
        // The spelling *is* the prompt here, so showing it gives nothing away —
        // what is being marked is the transcript, against the IPA below it.
        instruction: 'Say this word aloud, then type what you said.',
        text,
        ipa: str(payload, 'ipa'),
      };
    }

    case 'construction':
    case 'reading_response': {
      const bangla = str(payload, 'banglaText');

      if (bangla === undefined) {
        return null;
      }

      return {
        label: question.type === 'construction' ? 'Construction' : 'Reading to writing',
        instruction: 'Write this sentence in English.',
        bangla,
      };
    }

    default:
      return null;
  }
}

/**
 * One question, whatever kind it is.
 *
 * The payload arrives as `unknown` because 004 stores it as `jsonb` and the
 * four question types do not share a shape. It is read defensively rather than
 * cast: a question whose payload is missing the one field it cannot be asked
 * without renders as an unanswerable question with a visible note, which is a
 * bug someone reports, instead of a runtime crash that takes the whole paper
 * down mid-attempt.
 *
 * Every type is answered by typing, because every type is *marked* by comparing
 * text — `ExamAnswerMarker` normalises and compares for three of them and hands
 * the fourth to the speech judge as a transcript. A control the marker cannot
 * read would be a nicer screen and an unmarkable paper.
 *
 * **There is no answer key in this component's props and no branch that could
 * display one.** Rule 3 is held by the shape the server sends.
 */
export function QuestionView({
  question,
  value,
  onChange,
  disabled,
}: IQuestionViewProps): ReactElement {
  const shown = asked(question);

  return (
    <div className="flex flex-col gap-4">
      <p className="label text-primary-100">{shown?.label ?? question.type.replace(/_/gu, ' ')}</p>

      {shown === null ? (
        <p className="text-secondary-300">
          This question is missing its prompt. Flag it and move on — it will not be marked against
          you.
        </p>
      ) : (
        <>
          <p className="font-display text-xl tracking-tight">{shown.instruction}</p>

          {shown.text !== undefined && (
            <p className="font-display text-3xl tracking-tight text-surface">{shown.text}</p>
          )}

          {shown.ipa !== undefined && (
            <p className="num text-2xl text-primary-100">/{shown.ipa}/</p>
          )}

          {shown.bangla !== undefined && (
            <p className="font-bengali text-xl text-primary-100" lang="bn">
              {shown.bangla}
            </p>
          )}

          {shown.hint !== undefined && <p className="label text-primary-100">{shown.hint}</p>}
        </>
      )}

      <label className="label" htmlFor={`answer-${question.id}`}>
        Your answer
      </label>
      <input
        autoComplete="off"
        className="h-10 w-full max-w-xl rounded-control border border-primary-700 bg-primary-700/40 px-3 text-surface"
        disabled={disabled}
        id={`answer-${question.id}`}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        spellCheck={false}
        value={value}
      />
    </div>
  );
}
