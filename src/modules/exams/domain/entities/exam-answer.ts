export interface IExamAnswerProps {
  readonly id: string;
  readonly questionId: string;
  readonly attemptId: string;
  readonly profileId: string;
  /** Null until the learner writes something. A flag alone creates the row. */
  readonly submittedValue: string | null;
  /** Null until the attempt is marked. Marking is not done as they type. */
  readonly isCorrect: boolean | null;
  readonly awardedPoints: number;
  readonly flagged: boolean;
  readonly answeredAt: Date | null;
  readonly timeSpentMs: number | null;
}

/**
 * One learner's answer to one question.
 *
 * Upserted rather than inserted, on 004's `unique (question_id)`, which is what
 * makes a replayed save idempotent instead of leaving two answers to the same
 * question and a score that depends on which one is read first.
 *
 * Marking is deliberately **not** done here as the learner types. `isCorrect`
 * and `awardedPoints` are written once, at submission, by `ExamScoringService`
 * — grading during the attempt would mean the answer to "how am I doing" exists
 * on the server mid-exam, and every leak of a live score starts with it being
 * computed early.
 */
export class ExamAnswer {
  readonly id: string;
  readonly questionId: string;
  readonly attemptId: string;
  readonly profileId: string;
  readonly submittedValue: string | null;
  readonly isCorrect: boolean | null;
  readonly awardedPoints: number;
  readonly flagged: boolean;
  readonly answeredAt: Date | null;
  readonly timeSpentMs: number | null;

  constructor(props: IExamAnswerProps) {
    this.id = props.id;
    this.questionId = props.questionId;
    this.attemptId = props.attemptId;
    this.profileId = props.profileId;
    this.submittedValue = props.submittedValue;
    this.isCorrect = props.isCorrect;
    this.awardedPoints = props.awardedPoints;
    this.flagged = props.flagged;
    this.answeredAt = props.answeredAt;
    this.timeSpentMs = props.timeSpentMs;
  }

  static blank(props: {
    readonly id: string;
    readonly questionId: string;
    readonly attemptId: string;
    readonly profileId: string;
  }): ExamAnswer {
    return new ExamAnswer({
      ...props,
      submittedValue: null,
      isCorrect: null,
      awardedPoints: 0,
      flagged: false,
      answeredAt: null,
      timeSpentMs: null,
    });
  }

  /** A saved answer. Overwrites freely — a learner may change their mind. */
  withValue(value: string, now: Date, timeSpentMs: number | null): ExamAnswer {
    return new ExamAnswer({
      ...this.toProps(),
      submittedValue: value,
      answeredAt: now,
      timeSpentMs,
    });
  }

  /**
   * Flagging is independent of answering. A learner flags a question they have
   * answered and want to revisit as often as one they have skipped, so this
   * touches neither the value nor `answeredAt`.
   */
  withFlag(flagged: boolean): ExamAnswer {
    return new ExamAnswer({ ...this.toProps(), flagged });
  }

  /** The mark, written once at submission. */
  marked(isCorrect: boolean, awardedPoints: number): ExamAnswer {
    return new ExamAnswer({ ...this.toProps(), isCorrect, awardedPoints });
  }

  isAnswered(): boolean {
    return this.submittedValue !== null;
  }

  private toProps(): IExamAnswerProps {
    return {
      id: this.id,
      questionId: this.questionId,
      attemptId: this.attemptId,
      profileId: this.profileId,
      submittedValue: this.submittedValue,
      isCorrect: this.isCorrect,
      awardedPoints: this.awardedPoints,
      flagged: this.flagged,
      answeredAt: this.answeredAt,
      timeSpentMs: this.timeSpentMs,
    };
  }
}
