'use client';

import { useState, type ReactElement } from 'react';
import { DataTable, type IColumn } from '@/components/data/data-table';
import { Drawer } from '@/components/overlays/drawer';
import { MonoValue } from '@/components/primitives/mono-value';
import { StatusBadge } from '@/components/primitives/status-badge';
import { answerText, diffCharacters } from './diff';

/** One line of the answer-review table. `...Line`, not `...Row` — see `rows.test.ts`. */
export interface IAnswerReviewLine {
  readonly questionId: string;
  readonly sectionCode: string;
  readonly orderIndex: number;
  readonly prompt: string;
  readonly submittedValue: string | null;
  readonly correctAnswer: string;
  readonly isCorrect: boolean | null;
  readonly awardedPoints: number;
  readonly flagged: boolean;
}

const COLUMNS: readonly IColumn<IAnswerReviewLine>[] = [
  {
    id: 'order',
    header: '#',
    pinned: true,
    numeric: true,
    width: '4rem',
    render: (row) => row.orderIndex + 1,
  },
  { id: 'section', header: 'Section', width: '12rem', render: (row) => row.sectionCode },
  {
    id: 'yours',
    header: 'Your answer',
    width: '14rem',
    render: (row) =>
      row.submittedValue === null || row.submittedValue === '' ? (
        <span className="text-muted">blank</span>
      ) : (
        <span className="font-mono">{row.submittedValue}</span>
      ),
  },
  {
    id: 'verdict',
    header: 'Verdict',
    width: '8rem',
    render: (row) =>
      row.isCorrect === null ? (
        <StatusBadge label="Unmarked" tone="neutral" />
      ) : (
        <StatusBadge label={row.isCorrect ? 'Correct' : 'Wrong'} tone={row.isCorrect ? 'passed' : 'failed'} />
      ),
  },
  { id: 'points', header: 'Points', numeric: true, width: '6rem', render: (row) => row.awardedPoints },
  {
    id: 'flagged',
    header: 'Flagged',
    width: '6rem',
    render: (row) => (row.flagged ? <StatusBadge label="Flagged" tone="due" /> : <span className="text-muted">—</span>),
  },
];

/**
 * Master-detail over a finished paper.
 *
 * **The diff is the reason this screen exists.** Seeing "wrong" beside
 * `recieve` teaches nothing; seeing the `ie` struck through and the `ei` added
 * is the whole lesson. It is a character diff for exactly that reason — a word
 * diff would render the same answer as "replaced" and say nothing.
 *
 * Arrows navigate, Enter opens the drawer, the drawer returns focus to the
 * cell. Nothing new is needed for the keyboard; `DataTable` and `Drawer`
 * already carry it.
 */
export function ExamReviewTable({ rows }: { readonly rows: readonly IAnswerReviewLine[] }): ReactElement {
  const [selected, setSelected] = useState<IAnswerReviewLine | null>(null);

  return (
    <>
      <DataTable
        caption="Every question · arrows move, Enter opens the answer"
        columns={COLUMNS}
        emptyMessage="This attempt has no questions to review."
        onActivate={setSelected}
        onCursorChange={() => undefined}
        page={{ nextCursor: null }}
        rowKey={(row) => row.questionId}
        rows={rows}
      />

      <Drawer
        onClose={() => { setSelected(null); }}
        open={selected !== null}
        title={selected === null ? '' : `Question ${String(selected.orderIndex + 1)}`}
      >
        {selected !== null && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="label">Question</p>
              <p className="mt-1">{selected.prompt}</p>
            </div>

            <div>
              <p className="label">Difference</p>
              <p className="mt-1 font-mono text-base leading-relaxed">
                {diffCharacters(answerText(selected.submittedValue ?? ''), selected.correctAnswer).map(
                  (part, index) => (
                    <span
                      className={
                        part.kind === 'same'
                          ? undefined
                          : part.kind === 'removed'
                            ? 'bg-tertiary-100 text-tertiary-700 line-through'
                            : 'bg-mastered/10 text-mastered'
                      }
                      key={`${part.kind}-${String(index)}`}
                    >
                      {part.text}
                    </span>
                  ),
                )}
              </p>
              {/*
                Struck-through and underlined-in-green would both be colour-only
                cues on their own, so the key below says which is which in
                words.
              */}
              <p className="mt-2 text-[11px] text-muted">
                Struck through: what you wrote that does not belong. Highlighted: what was missing.
              </p>
            </div>

            <div>
              <p className="label">Correct answer</p>
              <p className="mt-1 font-mono">{selected.correctAnswer}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <MonoValue unit="pts" value={selected.awardedPoints} />
              {selected.flagged && <StatusBadge label="You flagged this" tone="due" />}
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
