import { type LearnerProfile } from '../../domain/entities/learner-profile';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '../../domain/repositories/learner-profile-repository';

export interface IGetMeInput {
  /** From the verified session. A handler cannot supply this from a body. */
  readonly userId: string;
}

/**
 * The learner reading themselves.
 *
 * It looks thin enough to inline into the handler, and it is not: this is the
 * one implementation both paths run. `11-api-surface.md` is explicit that a
 * Server Component reads by calling the use case rather than fetching its own
 * API over HTTP, and the dashboard in Phase 10 is exactly that reader. Inlining
 * it into the route handler would guarantee a second implementation the first
 * time a page needed the same answer.
 */
export class GetMeUseCase {
  constructor(private readonly profiles: ILearnerProfileRepository) {}

  async execute(input: IGetMeInput): Promise<LearnerProfile> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      // F3.9's reconciler runs on every sign-in, so this means the profile was
      // removed after the session was issued. Saying so beats a null the caller
      // has to invent a meaning for.
      throw new ProfileNotFoundError(input.userId);
    }

    return profile;
  }
}
