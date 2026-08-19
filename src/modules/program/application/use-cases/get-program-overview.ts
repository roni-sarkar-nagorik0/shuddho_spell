import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ILessonRepository } from '@/modules/lessons/domain/repositories/lesson-repository';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type IProgramRepository } from '../../domain/repositories/program-repository';
import { type IProgramOverview } from '../dto/program-overview';

export interface IGetProgramOverviewInput {
  /** From the verified session. Never from a body. */
  readonly userId: string;
}

/**
 * The whole programme at a glance: 28 tiles, which are done, which is next.
 *
 * Three repositories and one shape. The alternative — a component fetching
 * days, then position, then completions — is three round trips and three
 * chances for the three to disagree about what "current" means.
 */
export class GetProgramOverviewUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly program: IProgramRepository,
    private readonly lessons: ILessonRepository,
  ) {}

  async execute(input: IGetProgramOverviewInput): Promise<IProgramOverview> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const [days, completed] = await Promise.all([
      this.program.listDays(profile.track),
      this.lessons.findCompletedDayIndexes(profile.id),
    ]);

    const completedSet = new Set(completed);
    const current = profile.currentDayIndex.value;

    return {
      track: profile.track,
      totalDays: profile.totalDays(),
      currentDayIndex: current,
      completedDays: completedSet.size,
      days: days.map((day) => ({
        dayIndex: day.dayIndex.value,
        weekIndex: day.weekIndex,
        title: day.title,
        estimatedMinutes: day.estimatedMinutes,
        isComplete: completedSet.has(day.dayIndex.value),
        // Everything up to and including where the learner has reached. A
        // finished day stays open — review is the first stage of every lesson
        // and a learner returning to day 3 to practise is doing the right thing.
        isUnlocked: day.dayIndex.value <= current,
      })),
    };
  }
}
