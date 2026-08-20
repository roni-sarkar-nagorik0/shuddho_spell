import { type ExamSectionCode } from '../value-objects/exam-section-code';

/**
 * A section was submitted that is not the one the learner is on.
 *
 * Both directions are this error and both are refused. Behind: the section is
 * already locked and rule 4 says **nothing reopens it** — not a retry, not an
 * admin endpoint, not a debug one. Ahead: skipping forward would lock the
 * section in between unanswered.
 *
 * The commonest cause is the harmless one — a double-click, or a client
 * retrying a submit whose response was lost. It is still refused, because the
 * alternative is a second `advanceSection` that skips a section nobody sat.
 */
export class SectionNotCurrentError extends Error {
  constructor(
    readonly attemptId: string,
    readonly submitted: ExamSectionCode,
    readonly current: ExamSectionCode | null,
  ) {
    super(
      `section ${submitted} is not the open section on attempt ${attemptId} (that is ${current ?? 'none — every section is submitted'})`,
    );
    this.name = 'SectionNotCurrentError';
  }
}
