import { type PushSubscription } from '../entities/push-subscription';

export const PUSH_SUBSCRIPTION_REPOSITORY = Symbol('PUSH_SUBSCRIPTION_REPOSITORY');

export interface IPushSubscriptionRepository {
  readonly findByProfile: (profileId: string) => Promise<readonly PushSubscription[]>;

  /**
   * Creates or **moves** on `endpoint`.
   *
   * The endpoint is globally unique because it identifies a browser install,
   * not a learner: a shared device re-subscribed by a second learner moves the
   * row rather than duplicating it, so a push cannot reach the wrong person.
   */
  readonly upsert: (subscription: PushSubscription) => Promise<PushSubscription>;

  /**
   * Deletes by endpoint. Called on a 410 as well as on an explicit revoke, and
   * both are ordinary events rather than failures.
   */
  readonly deleteByEndpoint: (endpoint: string) => Promise<void>;
}
