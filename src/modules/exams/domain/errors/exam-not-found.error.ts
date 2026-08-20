/** No exam by that code, or none the learner owns. */
export class ExamNotFoundError extends Error {
  constructor(readonly reference: string) {
    super(`exam ${reference} does not exist`);
    this.name = 'ExamNotFoundError';
  }
}
