'use client';

import { useState, type ReactElement } from 'react';

export interface ICheckItem {
  readonly prompt: string;
  readonly answer: string;
  readonly why: string;
}

/**
 * The end-of-day questions, with the answer hidden until it is asked for.
 *
 * A Client Component for one reason: the answer must not be in view while the
 * learner is thinking, and it must not cost a round trip to see. Nothing is
 * submitted, scored or stored — there is no attempt row behind this and no
 * pretence of one. Marking these would mean judging free text against a written
 * answer, which this course cannot do honestly, so it does not claim to.
 *
 * Each answer is revealed on its own. One button showing all four would let the
 * learner see question three's answer while reading question two.
 */
export function Checks({ items }: { readonly items: readonly ICheckItem[] }): ReactElement {
  const [shown, setShown] = useState<readonly number[]>([]);

  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, index) => {
        const isShown = shown.includes(index);

        return (
          <li className="rounded-control border border-hairline bg-surface p-3" key={item.prompt}>
            <p className="text-primary-900">{item.prompt}</p>

            {isShown ? (
              <div className="mt-2 border-l-2 border-primary-100 pl-3">
                <p className="font-medium text-primary-900">{item.answer}</p>
                <p className="mt-1 text-muted">{item.why}</p>
              </div>
            ) : (
              <button
                className="mt-2 h-8 rounded-control border border-hairline px-3 text-neutral-700 hover:bg-primary-50"
                onClick={() => {
                  setShown((current) => [...current, index]);
                }}
                type="button"
              >
                Show the answer
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
