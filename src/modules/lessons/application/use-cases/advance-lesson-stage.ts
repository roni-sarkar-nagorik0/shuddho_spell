import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error';
import { type ILessonRepository } from '../../domain/repositories/lesson-repository';
import { type LessonStage } from '../../domain/value-objects/lesson-stage';

export interface IAdvanceLessonStageInput {
  readonly userId: string;
  readonly sessionId: string;
  /** Where the client believes it is going. Checked, never trusted. */
  readonly toStage: LessonStage;
}

export interface IAdvanceLessonStageOutput {
  readonly sessionId: string;
  readonly stage: LessonStage;
}

/**
 * Moves a session on one stage.
 *
 * The client sends its target rather than "next", which looks like the weaker
 * design and is the stronger one: it makes a stale request detectable. A learner
 * whose tab has been open since yesterday, or who double-taps the button, sends
 * `dictate` when the session is already at `speak` — with "next" that quietly
 * skips them to `build`, and with a named target the entity refuses it.
 */
export class AdvanceLessonStageUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly lessons: ILessonRepository,
  ) {}

  async execute(input: IAdvanceLessonStageInput): Promise<IAdvanceLessonStageOutput> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const session = await this.lessons.findById(input.sessionId);

    // Ownership is checked here rather than left to RLS. RLS is the floor, not
    // the rule: it stops the row being read at all, and this stops the use case
    // being reasoned about as if any session id would do.
    if (session === null || session.profileId !== profile.id) {
      throw new SessionNotFoundError(input.sessionId);
    }

    const advanced = await this.lessons.save(session.advanceStageTo(input.toStage));

    return { sessionId: advanced.id, stage: advanced.stage };
  }
}
