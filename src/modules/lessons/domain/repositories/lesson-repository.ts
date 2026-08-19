import { type DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { type LessonSession } from '../entities/lesson-session';

export const LESSON_REPOSITORY = Symbol('LESSON_REPOSITORY');

export interface ILessonRepository {
  readonly findById: (id: string) => Promise<LessonSession | null>;

  /**
   * The learner's unfinished session for a day, if there is one.
   *
   * This is what makes a session resumable, and it is why starting a lesson is
   * not an insert: a learner who closed the tab at `dictate` and comes back
   * must land on `dictate`, not on a second session that starts the day again
   * and double-counts every attempt they are about to make.
   */
  readonly findOpenForDay: (profileId: string, dayIndex: DayIndex) => Promise<LessonSession | null>;

  /**
   * Which days this learner has finished, as day numbers.
   *
   * Numbers rather than sessions: the overview renders 28 tiles and needs to
   * know which are ticked, and loading 28 full sessions to answer that is the
   * N+1 the Phase 5 gate asserts against.
   */
  readonly findCompletedDayIndexes: (profileId: string) => Promise<readonly number[]>;

  readonly create: (session: LessonSession) => Promise<LessonSession>;

  readonly save: (session: LessonSession) => Promise<LessonSession>;
}
