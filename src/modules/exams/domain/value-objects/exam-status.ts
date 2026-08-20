/**
 * Where an attempt is — 004's `exam_attempts_status_check`.
 *
 * Five states and not four: `submitted` is distinct from `passed`/`failed`
 * because the diagnostic has no pass mark and ends there permanently, and
 * because a graded attempt is submitted *before* it is scored. Collapsing them
 * would mean an attempt that has been handed in but not yet marked has no
 * status to be in.
 */
export const EXAM_STATUSES = Object.freeze([
  'scheduled',
  'in_progress',
  'submitted',
  'passed',
  'failed',
] as const);

export type ExamStatus = (typeof EXAM_STATUSES)[number];

/**
 * The only moves there are.
 *
 * Written as data rather than as a chain of `if`s so the whole rule is legible
 * at once, and so the answer to "can an attempt be reopened" is a lookup with
 * one answer: `submitted`, `passed` and `failed` allow nothing back. Rule 4 of
 * `08-exam-engine.md` says there is no endpoint anywhere that reopens a
 * submitted section, and a status graph that cannot express it is how that
 * stays true when somebody writes the endpoint anyway.
 */
const LEGAL_MOVES: Readonly<Record<ExamStatus, readonly ExamStatus[]>> = Object.freeze({
  scheduled: ['in_progress'],
  in_progress: ['submitted'],
  submitted: ['passed', 'failed'],
  passed: [],
  failed: [],
});

export function canTransition(from: ExamStatus, to: ExamStatus): boolean {
  return LEGAL_MOVES[from].includes(to);
}

/** Nothing moves out of these. A finished attempt is finished. */
export function isTerminal(status: ExamStatus): boolean {
  return LEGAL_MOVES[status].length === 0;
}

/** The one state in which answers may still be written. */
export function acceptsWrites(status: ExamStatus): boolean {
  return status === 'in_progress';
}
