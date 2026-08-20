import { type ExamAttempt } from '../entities/exam-attempt';

export const EXAM_ATTEMPT_REPOSITORY = Symbol('EXAM_ATTEMPT_REPOSITORY');

export interface IExamAttemptRepository {
  readonly findById: (id: string) => Promise<ExamAttempt | null>;

  /**
   * The learner's live attempt at one exam, if they have one.
   *
   * 004 backs this with a partial unique index on `status = 'in_progress'`, so
   * "start a second concurrent attempt" is refused by the database rather than
   * by a check the API has to win every race to run.
   */
  readonly findActive: (profileId: string, definitionId: string) => Promise<ExamAttempt | null>;

  /** Every attempt at one exam, newest first — the attempt count and cooldown. */
  readonly findForExam: (
    profileId: string,
    definitionId: string,
  ) => Promise<readonly ExamAttempt[]>;

  /** Every attempt the learner has made, for the catalogue's lock states. */
  readonly findAllForProfile: (profileId: string) => Promise<readonly ExamAttempt[]>;

  /**
   * Every attempt anywhere that is past its deadline and still open — the cron
   * backstop's only read. Not scoped to a profile on purpose: nobody owns it.
   */
  readonly findAbandoned: (now: Date) => Promise<readonly ExamAttempt[]>;

  readonly save: (attempt: ExamAttempt) => Promise<ExamAttempt>;
}
