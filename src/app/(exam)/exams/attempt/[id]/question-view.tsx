'use client';

import { type ReactElement } from 'react';
import { type ExamQuestionView } from '@/app/(learn)/exams/[code]/exam-contracts';

export interface IQuestionViewProps {
  readonly question: ExamQuestionView;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled: boolean;
}

interface IPayload {
  readonly prompt?: unknown;
  readonly bangla?: unknown;
  readonly options?: unknown;
  readonly passage?: unknown;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function options(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

/**
 * One question, whatever kind it is.
 *
 * The payload arrives as `JsonValue` because 004 stores it as `jsonb` and the
 * six question types do not share a shape. It is read defensively rather than
 * cast: a question whose payload is missing a prompt renders as an unanswerable
 * question with a visible note, which is a bug someone reports, instead of a
 * runtime crash that takes the whole paper down mid-attempt.
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
  const payload = (question.payload ?? {}) as IPayload;
  const prompt = text(payload.prompt);
  const bangla = text(payload.bangla);
  const passage = text(payload.passage);
  const choices = options(payload.options);

  return (
    <div className="flex flex-col gap-4">
      <p className="label text-primary-100">{question.type.replace(/_/gu, ' ')}</p>

      {passage !== null && (
        <p className="rounded-card border border-primary-700 bg-primary-700/40 p-3">{passage}</p>
      )}

      {prompt === null ? (
        <p className="text-secondary-300">
          This question is missing its prompt. Flag it and move on — it will not be marked against
          you.
        </p>
      ) : (
        <p className="font-display text-xl tracking-tight">{prompt}</p>
      )}

      {bangla !== null && (
        <p className="font-bengali text-primary-100" lang="bn">
          {bangla}
        </p>
      )}

      {choices.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {choices.map((choice) => (
            <li key={choice}>
              <label className="flex items-center gap-2 rounded-control border border-primary-700 px-3 py-2">
                <input
                  checked={value === choice}
                  disabled={disabled}
                  name={question.id}
                  onChange={() => { onChange(choice); }}
                  type="radio"
                  value={choice}
                />
                {choice}
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <label className="label" htmlFor={`answer-${question.id}`}>
            Your answer
          </label>
          <input
            autoComplete="off"
            className="h-10 w-full max-w-xl rounded-control border border-primary-700 bg-primary-700/40 px-3 text-surface"
            disabled={disabled}
            id={`answer-${question.id}`}
            onChange={(event) => { onChange(event.target.value); }}
            spellCheck={false}
            value={value}
          />
        </>
      )}
    </div>
  );
}
