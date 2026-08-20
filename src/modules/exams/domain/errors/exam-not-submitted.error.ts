/**
 * A result or a review was asked for on an attempt still being sat.
 *
 * This is the guard on the **only** endpoint in the product that returns
 * correct answers. Rule 3 of `08-exam-engine.md` bounds the answer key by
 * *time*, not by route: the review may show it, and only once the paper is in.
 * A learner who could reach the review mid-attempt would have an answer key
 * with the exam still open in the next tab.
 *
 * 409 rather than 403 or 404: the attempt is theirs and the endpoint is real.
 * The request is simply premature, and it will succeed later without anything
 * changing about who they are.
 */
export class ExamNotSubmittedError extends Error {
  constructor(readonly attemptId: string) {
    super(`exam attempt ${attemptId} has not been submitted`);
    this.name = 'ExamNotSubmittedError';
  }
}
