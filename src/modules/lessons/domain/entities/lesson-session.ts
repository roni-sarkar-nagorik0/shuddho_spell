import { type DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { IllegalStageTransitionError } from '../errors/illegal-stage-transition.error';
import { SessionAlreadyCompletedError } from '../errors/session-already-completed.error';
import {
  LESSON_STAGES,
  stagePosition,
  type LessonStage,
} from '../value-objects/lesson-stage';

export interface ILessonSessionProps {
  readonly id: string;
  readonly profileId: string;
  readonly dayIndex: DayIndex;
  readonly stage: LessonStage;
  readonly startedAt: Date;
  /** Null while the session is still open. */
  readonly completedAt: Date | null;
  readonly itemsTotal: number;
  readonly itemsCorrect: number;
}

/**
 * One learner's attempt at one day of the programme.
 *
 * A session is resumable by design: it carries the stage it reached and no
 * expiry. A learner who closes the tab at `dictate` and comes back tomorrow
 * continues at `dictate` — the day they are on is `currentDayIndex` on the
 * profile, and it is not advanced by the clock.
 */
export class LessonSession {
  readonly id: string;
  readonly profileId: string;
  readonly dayIndex: DayIndex;
  readonly stage: LessonStage;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly itemsTotal: number;
  readonly itemsCorrect: number;

  constructor(props: ILessonSessionProps) {
    this.id = props.id;
    this.profileId = props.profileId;
    this.dayIndex = props.dayIndex;
    this.stage = props.stage;
    this.startedAt = props.startedAt;
    this.completedAt = props.completedAt;
    this.itemsTotal = props.itemsTotal;
    this.itemsCorrect = props.itemsCorrect;
  }

  isComplete(): boolean {
    return this.completedAt !== null;
  }

  /**
   * Moves to the next stage, and only to the next stage.
   *
   * Forwards by exactly one. Not two — skipping `dictate` means being asked to
   * pronounce a word never spelled. Not backwards — a learner replaying `learn`
   * after `speak` would re-enter items already counted, and `itemsTotal` would
   * grow past what the day contains. Both are the same refusal because both
   * produce a session that no longer describes what happened.
   *
   * Returns a new instance; state changes never mutate.
   */
  advanceStage(): LessonSession {
    if (this.isComplete()) {
      throw new SessionAlreadyCompletedError(this.id);
    }

    const next = LESSON_STAGES[stagePosition(this.stage) + 1];

    if (next === undefined) {
      // `build` is the last stage. Leaving it is completion, which is
      // `complete()`'s job and carries a timestamp this method has no clock for.
      throw new IllegalStageTransitionError(this.stage, this.stage);
    }

    return new LessonSession({ ...this.toProps(), stage: next });
  }

  /**
   * Moves to a named stage. The client sends where it thinks it is going, so
   * the request is checked against the ladder rather than trusted — the same
   * rule as `advanceStage()`, stated once, with the caller's target honoured
   * only when it is the one legal answer.
   */
  advanceStageTo(target: LessonStage): LessonSession {
    if (this.isComplete()) {
      throw new SessionAlreadyCompletedError(this.id);
    }

    if (stagePosition(target) !== stagePosition(this.stage) + 1) {
      throw new IllegalStageTransitionError(this.stage, target);
    }

    return new LessonSession({ ...this.toProps(), stage: target });
  }

  /**
   * Records one answered item. Correctness is counted here rather than
   * recomputed from the attempts table later: the attempt rows are immutable
   * and this is the running total the session screen shows.
   */
  recordItemResult(isCorrect: boolean): LessonSession {
    if (this.isComplete()) {
      throw new SessionAlreadyCompletedError(this.id);
    }

    return new LessonSession({
      ...this.toProps(),
      itemsTotal: this.itemsTotal + 1,
      itemsCorrect: this.itemsCorrect + (isCorrect ? 1 : 0),
    });
  }

  /**
   * Closes the session. Only from the last stage: completing at `dictate` would
   * mark a day done that the learner never spoke or built a sentence in.
   */
  complete(now: Date): LessonSession {
    if (this.isComplete()) {
      throw new SessionAlreadyCompletedError(this.id);
    }

    const last = LESSON_STAGES[LESSON_STAGES.length - 1];

    if (last === undefined || this.stage !== last) {
      throw new IllegalStageTransitionError(this.stage, last ?? this.stage);
    }

    return new LessonSession({ ...this.toProps(), completedAt: now });
  }

  private toProps(): ILessonSessionProps {
    return {
      id: this.id,
      profileId: this.profileId,
      dayIndex: this.dayIndex,
      stage: this.stage,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      itemsTotal: this.itemsTotal,
      itemsCorrect: this.itemsCorrect,
    };
  }
}
