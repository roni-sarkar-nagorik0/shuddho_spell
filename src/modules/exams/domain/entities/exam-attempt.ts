import { type ScorePercent } from '@/modules/shared/domain/value-objects/score-percent';
import { ExamTimeExpiredError } from '../errors/exam-time-expired.error';
import { IllegalAttemptTransitionError } from '../errors/illegal-attempt-transition.error';
import { type ExamSectionCode } from '../value-objects/exam-section-code';
import { acceptsWrites, canTransition, type ExamStatus } from '../value-objects/exam-status';

const MILLISECONDS_PER_SECOND = 1000;

export interface IExamAttemptProps {
  readonly id: string;
  readonly profileId: string;
  readonly definitionId: string;
  readonly attemptNumber: number;
  readonly status: ExamStatus;
  readonly startedAt: Date | null;
  /** The only clock that counts. Set once; see `start()`. */
  readonly serverDeadlineAt: Date | null;
  readonly submittedAt: Date | null;
  readonly currentSectionIndex: number;
  readonly scorePercent: ScorePercent | null;
  readonly sectionScores: Readonly<Partial<Record<ExamSectionCode, number>>>;
  readonly passed: boolean | null;
  /** Makes the paper reproducible — `ExamBlueprintService` selects from it. */
  readonly seed: string;
}

/**
 * One learner's run at one exam.
 *
 * Everything `08-exam-engine.md` calls server-authoritative is a field on this
 * object rather than an argument to a method: the deadline, the section the
 * learner is on, the attempt number, the score. The client is never asked for
 * any of them and there is no method here that accepts one.
 *
 * **The deadline is set once.** `start()` is the only thing that writes it, it
 * refuses to run twice, and nothing else in the class touches it. Not resume,
 * not a section boundary, not reconnection. That is rule 1, and the reason it is
 * expressed as "no method exists" rather than as a check is that a check can be
 * called with the wrong argument and a missing method cannot be called at all.
 */
export class ExamAttempt {
  readonly id: string;
  readonly profileId: string;
  readonly definitionId: string;
  readonly attemptNumber: number;
  readonly status: ExamStatus;
  readonly startedAt: Date | null;
  readonly serverDeadlineAt: Date | null;
  readonly submittedAt: Date | null;
  readonly currentSectionIndex: number;
  readonly scorePercent: ScorePercent | null;
  readonly sectionScores: Readonly<Partial<Record<ExamSectionCode, number>>>;
  readonly passed: boolean | null;
  readonly seed: string;

  constructor(props: IExamAttemptProps) {
    this.id = props.id;
    this.profileId = props.profileId;
    this.definitionId = props.definitionId;
    this.attemptNumber = props.attemptNumber;
    this.status = props.status;
    this.startedAt = props.startedAt;
    this.serverDeadlineAt = props.serverDeadlineAt;
    this.submittedAt = props.submittedAt;
    this.currentSectionIndex = props.currentSectionIndex;
    this.scorePercent = props.scorePercent;
    this.sectionScores = props.sectionScores;
    this.passed = props.passed;
    this.seed = props.seed;
  }

  /**
   * Begins the attempt and fixes its deadline.
   *
   * `now + durationSeconds`, computed here from the injected clock and stored.
   * A second call throws rather than re-deriving it — a resumed attempt calls
   * nothing, it reads `serverDeadlineAt` and subtracts.
   */
  start(now: Date, durationSeconds: number): ExamAttempt {
    this.assertCanMoveTo('in_progress');

    return new ExamAttempt({
      ...this.toProps(),
      status: 'in_progress',
      startedAt: now,
      serverDeadlineAt: new Date(now.getTime() + durationSeconds * MILLISECONDS_PER_SECOND),
    });
  }

  isExpired(now: Date): boolean {
    return this.serverDeadlineAt !== null && now.getTime() > this.serverDeadlineAt.getTime();
  }

  /**
   * What the countdown shows, computed from the server's clock and never from
   * the browser's. Floors at zero: negative time remaining is not a state, it
   * is an expired attempt, and `isExpired` is the question for that.
   */
  remainingSeconds(now: Date): number {
    if (this.serverDeadlineAt === null) {
      return 0;
    }

    const remaining = this.serverDeadlineAt.getTime() - now.getTime();

    return Math.max(0, Math.floor(remaining / MILLISECONDS_PER_SECOND));
  }

  /**
   * The guard every write goes through. Both halves matter and they fail
   * differently: a finished attempt is a transition error, an overdue one is a
   * time error, and a client that conflates them tells the learner the wrong
   * thing about why their answer did not save.
   */
  assertWritable(now: Date): void {
    if (!acceptsWrites(this.status)) {
      throw new IllegalAttemptTransitionError(this.id, this.status, 'in_progress');
    }

    if (this.isExpired(now)) {
      throw new ExamTimeExpiredError(this.id, this.serverDeadlineAt ?? now);
    }
  }

  /**
   * Moves to the next section. One way, forwards, one at a time — rule 4.
   * There is no method that lowers this index, which is what makes "no endpoint
   * anywhere can reopen a submitted section" a property of the code rather than
   * a promise about the routes.
   */
  advanceSection(now: Date): ExamAttempt {
    this.assertWritable(now);

    return new ExamAttempt({
      ...this.toProps(),
      currentSectionIndex: this.currentSectionIndex + 1,
    });
  }

  hasFinishedSections(sectionCount: number): boolean {
    return this.currentSectionIndex >= sectionCount;
  }

  /**
   * Hands the paper in. Deliberately **not** guarded by the deadline: an
   * attempt that ran out of time is submitted, not rejected — rule 9's cron job
   * does exactly this to abandoned attempts, and a learner who clicks submit at
   * the moment it expires must not lose the work either.
   */
  submit(now: Date): ExamAttempt {
    this.assertCanMoveTo('submitted');

    return new ExamAttempt({ ...this.toProps(), status: 'submitted', submittedAt: now });
  }

  /**
   * Records the mark. Only from `submitted`, so a score cannot appear on an
   * attempt still being written, and the pass decision arrives with it rather
   * than being recomputed later from a score and a pass mark that may have
   * changed in between.
   */
  grade(
    scorePercent: ScorePercent,
    sectionScores: Readonly<Partial<Record<ExamSectionCode, number>>>,
    passed: boolean,
  ): ExamAttempt {
    const next: ExamStatus = passed ? 'passed' : 'failed';

    this.assertCanMoveTo(next);

    return new ExamAttempt({ ...this.toProps(), status: next, scorePercent, sectionScores, passed });
  }

  private assertCanMoveTo(next: ExamStatus): void {
    if (!canTransition(this.status, next)) {
      throw new IllegalAttemptTransitionError(this.id, this.status, next);
    }
  }

  private toProps(): IExamAttemptProps {
    return {
      id: this.id,
      profileId: this.profileId,
      definitionId: this.definitionId,
      attemptNumber: this.attemptNumber,
      status: this.status,
      startedAt: this.startedAt,
      serverDeadlineAt: this.serverDeadlineAt,
      submittedAt: this.submittedAt,
      currentSectionIndex: this.currentSectionIndex,
      scorePercent: this.scorePercent,
      sectionScores: this.sectionScores,
      passed: this.passed,
      seed: this.seed,
    };
  }
}
