import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { DayLockedError } from '@/modules/program/domain/errors/day-locked.error';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { ConflictError } from '@/modules/shared/domain/errors/conflict.error';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { LessonSession } from '../../domain/entities/lesson-session';
import { LESSON_STAGES } from '../../domain/value-objects/lesson-stage';
import { type ILessonRepository } from '../../domain/repositories/lesson-repository';

export interface IStartLessonSessionInput {
  readonly userId: string;
  readonly dayIndex: number;
}

export interface IStartLessonSessionOutput {
  readonly sessionId: string;
  readonly dayIndex: number;
  readonly stage: string;
  readonly itemsTotal: number;
  readonly itemsCorrect: number;
  /** True when an unfinished session was picked up rather than a new one made. */
  readonly resumed: boolean;
}

/**
 * Opens a day — **or picks up the one already open**.
 *
 * This is not an insert, and that is the entire design. A learner who reached
 * `dictate` and closed the tab must come back to `dictate`; a second session
 * for the same day would restart them at `review` and, worse, count every
 * attempt they are about to make against a fresh `itemsTotal` while the first
 * session sits half-finished in the table forever.
 *
 * Idempotent for the same reason `BootstrapProfileUseCase` is: a page load and
 * its own prefetch are enough to send this twice.
 */
export class StartLessonSessionUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly lessons: ILessonRepository,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(input: IStartLessonSessionInput): Promise<IStartLessonSessionOutput> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const dayIndex = DayIndex.of(input.dayIndex);

    if (dayIndex.value > profile.currentDayIndex.value) {
      throw new DayLockedError(dayIndex.value, profile.currentDayIndex.value);
    }

    const open = await this.lessons.findOpenForDay(profile.id, dayIndex);

    if (open !== null) {
      return this.toOutput(open, true);
    }

    try {
      const created = await this.lessons.create(
        new LessonSession({
          id: this.ids.next(),
          profileId: profile.id,
          dayIndex,
          // The ladder's first rung, read from the ladder. Writing 'review' here
          // would be a second place the order is stated.
          stage: LESSON_STAGES[0],
          startedAt: this.clock.now(),
          completedAt: null,
          itemsTotal: 0,
          itemsCorrect: 0,
        }),
      );

      return this.toOutput(created, false);
    } catch (caught: unknown) {
      // Lost the race. The read above and this insert are not one statement, so
      // two requests close together — a mount and its StrictMode double, two
      // tabs, a double tap — both see no open session and both try to make one.
      // 019's partial unique index is what makes the loser detectable instead of
      // successful, and the right answer for the loser is the winner's session:
      // that is what "or picks up the one already open" means when the one
      // already open was opened a millisecond ago.
      if (!(caught instanceof ConflictError)) {
        throw caught;
      }

      const winner = await this.lessons.findOpenForDay(profile.id, dayIndex);

      if (winner === null) {
        throw caught;
      }

      return this.toOutput(winner, true);
    }
  }

  private toOutput(session: LessonSession, resumed: boolean): IStartLessonSessionOutput {
    return {
      sessionId: session.id,
      dayIndex: session.dayIndex.value,
      stage: session.stage,
      itemsTotal: session.itemsTotal,
      itemsCorrect: session.itemsCorrect,
      resumed,
    };
  }
}
