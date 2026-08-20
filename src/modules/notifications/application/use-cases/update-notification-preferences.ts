import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { NotificationPreference } from '../../domain/entities/notification-preference';
import { type INotificationPreferenceRepository } from '../../domain/repositories/notification-preference-repository';
import { PreferenceDefaults } from '../../domain/services/preference-defaults';
import { ClockTime } from '../../domain/value-objects/clock-time';
import { type LiveChannel } from '../../domain/value-objects/notification-channel';
import { type NotificationType } from '../../domain/value-objects/notification-type';
import { toPreferenceViews, type IPreferencesView } from '../dto/notification-views';

/** One change the learner asked for. */
export interface IPreferenceUpdate {
  readonly type: NotificationType;
  /**
   * A **live** channel. The wire schema narrows to these two, so a body asking
   * to configure `email` fails validation rather than being silently ignored —
   * which is the honest answer while the app sends none.
   */
  readonly channel: LiveChannel;
  readonly enabled: boolean;
  readonly quietHoursStart: string | null;
  readonly quietHoursEnd: string | null;
  readonly reminderTime: string | null;
}

export interface IUpdateNotificationPreferencesInput {
  readonly userId: string;
  readonly updates: readonly IPreferenceUpdate[];
}

/**
 * Saves what the learner changed.
 *
 * Each update is written as a whole row rather than a patch, because 005 stores
 * a row per `(type, channel)` and half a quiet window is refused by both the
 * entity and the constraint — a partial update would have to read, merge and
 * write, and the read would be a second source of truth for a screen that just
 * sent the values.
 *
 * The profile id comes from the session and is written onto every row here,
 * **never taken from the body**. There is no field for it, so a learner cannot
 * write another's preferences even by guessing an id.
 */
export class UpdateNotificationPreferencesUseCase {
  private readonly defaults = new PreferenceDefaults();

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly preferences: INotificationPreferenceRepository,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(input: IUpdateNotificationPreferencesInput): Promise<IPreferencesView> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const stored = await this.preferences.findByProfile(profile.id);

    const written = input.updates.map((update) => {
      const existing = stored.find(
        (preference) => preference.type === update.type && preference.channel === update.channel,
      );

      return new NotificationPreference({
        // Keeping the existing id matters: the upsert conflicts on
        // `(profile_id, type, channel)`, and a new id on every save would leave
        // the stored row's id changing under anything holding a reference.
        id: existing?.id ?? this.ids.next(),
        profileId: profile.id,
        type: update.type,
        channel: update.channel,
        enabled: update.enabled,
        quietHoursStart: update.quietHoursStart === null ? null : ClockTime.of(update.quietHoursStart),
        quietHoursEnd: update.quietHoursEnd === null ? null : ClockTime.of(update.quietHoursEnd),
        reminderTime: update.reminderTime === null ? null : ClockTime.of(update.reminderTime),
      });
    });

    await this.preferences.upsertMany(written);

    // Read back through the defaults so the response is the same complete
    // matrix the GET returns. A screen that saved and then rendered only what
    // it sent would show a table with holes in it.
    const merged = this.defaults.forProfile(
      profile.id,
      [...written, ...stored.filter((row) => !written.some((w) => w.type === row.type && w.channel === row.channel))],
      () => this.ids.next(),
    );

    return { preferences: toPreferenceViews([...merged]) };
  }
}
