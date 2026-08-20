import { type ExamStatus } from '../value-objects/exam-status';

/**
 * An attempt was asked to move somewhere it cannot go.
 *
 * The commonest cause is not a bug: it is a replayed request. A learner whose
 * connection dropped submits twice, a tab left open posts an answer to an
 * attempt that finished an hour ago. `08-exam-engine.md` rule 4 makes the
 * refusal absolute — nothing reopens a submitted section, so this is thrown
 * rather than tolerated.
 */
export class IllegalAttemptTransitionError extends Error {
  constructor(
    readonly attemptId: string,
    readonly from: ExamStatus,
    readonly to: ExamStatus,
  ) {
    super(`exam attempt ${attemptId} cannot move from ${from} to ${to}`);
    this.name = 'IllegalAttemptTransitionError';
  }
}
