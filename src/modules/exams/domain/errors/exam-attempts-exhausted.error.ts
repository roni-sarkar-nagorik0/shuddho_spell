import { type ExamCode } from '../value-objects/exam-code';

/** Every attempt at this exam has been used. Terminal — there is no waiting. */
export class ExamAttemptsExhaustedError extends Error {
  constructor(
    readonly code: ExamCode,
    readonly maxAttempts: number,
  ) {
    super(`exam ${code} allows ${String(maxAttempts)} attempts and they are all used`);
    this.name = 'ExamAttemptsExhaustedError';
  }
}
