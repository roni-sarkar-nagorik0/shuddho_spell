/**
 * A write arrived after the deadline the server set.
 *
 * Rule 2 of `08-exam-engine.md`, and the reason it is an error and not a
 * silently-ignored write: the learner has to be told, in the moment, that the
 * answer did not count. A save that returns 200 and stores nothing is the worst
 * of both — it looks like time remains.
 *
 * Maps to **409 `EXAM_TIME_EXPIRED`**, never 400: the request was well formed
 * and the client was not wrong to send it. Only the clock disagreed.
 */
export class ExamTimeExpiredError extends Error {
  constructor(
    readonly attemptId: string,
    readonly deadlineAt: Date,
  ) {
    super(`exam attempt ${attemptId} closed at ${deadlineAt.toISOString()}`);
    this.name = 'ExamTimeExpiredError';
  }
}
