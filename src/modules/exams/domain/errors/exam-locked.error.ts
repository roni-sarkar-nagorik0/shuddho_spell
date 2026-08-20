import { type ExamCode } from '../value-objects/exam-code';

/**
 * The learner has not reached the day this exam unlocks on.
 *
 * A 403, not a 404: the exam exists and they will get there. Telling them it
 * does not exist would be a lie they could disprove by reading the catalogue.
 */
export class ExamLockedError extends Error {
  constructor(
    readonly code: ExamCode,
    readonly unlocksOnDay: number,
    readonly currentDay: number,
  ) {
    super(
      `exam ${code} unlocks on day ${String(unlocksOnDay)}; the learner is on day ${String(currentDay)}`,
    );
    this.name = 'ExamLockedError';
  }
}
