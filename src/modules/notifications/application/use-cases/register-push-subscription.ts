import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { PushSubscription } from '../../domain/entities/push-subscription';
import { type IPushSubscriptionRepository } from '../../domain/repositories/push-subscription-repository';

export interface IRegisterPushSubscriptionInput {
  readonly userId: string;
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
  readonly userAgent: string | null;
}

export interface IPushRegistration {
  readonly endpoint: string;
  readonly registered: true;
}

/**
 * Records a browser's agreement to receive push.
 *
 * The upsert conflicts on `endpoint`, which is unique across the whole table
 * because it identifies a **browser install**, not a learner. On a shared
 * device the row moves to whoever is signed in now — the alternative is two
 * rows for one browser and a push arriving for the previous owner, which is the
 * one failure mode of this feature that would be genuinely harmful.
 *
 * The profile comes from the session. There is no field for it in the input.
 */
export class RegisterPushSubscriptionUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly subscriptions: IPushSubscriptionRepository,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(input: IRegisterPushSubscriptionInput): Promise<IPushRegistration> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    await this.subscriptions.upsert(
      new PushSubscription({
        id: this.ids.next(),
        profileId: profile.id,
        endpoint: input.endpoint,
        keys: { p256dh: input.p256dh, auth: input.auth },
        userAgent: input.userAgent,
        createdAt: this.clock.now(),
      }),
    );

    return { endpoint: input.endpoint, registered: true };
  }
}
