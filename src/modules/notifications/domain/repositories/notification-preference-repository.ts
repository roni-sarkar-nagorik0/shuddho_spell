import { type NotificationPreference } from '../entities/notification-preference';

export const NOTIFICATION_PREFERENCE_REPOSITORY = Symbol('NOTIFICATION_PREFERENCE_REPOSITORY');

export interface INotificationPreferenceRepository {
  /**
   * Every stored preference for one learner.
   *
   * Read whole rather than per type: there are sixteen rows at most (eight
   * types across the two live channels), the preferences screen shows all of
   * them, and the dispatcher needs the ones for the type it is sending plus
   * nothing else it would have to ask for separately.
   */
  readonly findByProfile: (profileId: string) => Promise<readonly NotificationPreference[]>;

  /** Upserts on `(profile_id, type, channel)` — 005's unique key. */
  readonly upsertMany: (
    preferences: readonly NotificationPreference[],
  ) => Promise<readonly NotificationPreference[]>;
}
