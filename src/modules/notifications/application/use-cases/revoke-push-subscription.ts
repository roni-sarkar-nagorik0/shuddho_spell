import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IPushSubscriptionRepository } from '../../domain/repositories/push-subscription-repository';

export interface IRevokePushSubscriptionInput {
  readonly userId: string;
  readonly endpoint: string;
}

export interface IPushRevocation {
  readonly revoked: boolean;
}

/**
 * Turns push off for one browser.
 *
 * The endpoint arrives in the body, so it is checked against the learner's own
 * subscriptions before anything is deleted — otherwise anybody holding a
 * capability URL could unsubscribe its owner. Revoking one that is not theirs
 * reports `revoked: false` rather than throwing: the learner asked for a state,
 * they have it, and a 404 would tell them whose endpoint they had guessed.
 */
export class RevokePushSubscriptionUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly subscriptions: IPushSubscriptionRepository,
  ) {}

  async execute(input: IRevokePushSubscriptionInput): Promise<IPushRevocation> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const owned = await this.subscriptions.findByProfile(profile.id);

    if (!owned.some((subscription) => subscription.endpoint === input.endpoint)) {
      return { revoked: false };
    }

    await this.subscriptions.deleteByEndpoint(input.endpoint);

    return { revoked: true };
  }
}
