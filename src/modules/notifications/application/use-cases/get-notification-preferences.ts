import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { type INotificationPreferenceRepository } from '../../domain/repositories/notification-preference-repository';
import { PreferenceDefaults } from '../../domain/services/preference-defaults';
import { toPreferenceViews, type IPreferencesView } from '../dto/notification-views';

export interface IGetNotificationPreferencesInput {
  readonly userId: string;
}

/**
 * The preferences screen's data.
 *
 * Always the **complete matrix** — every type on both live channels — with
 * stored rows filled in over the defaults. A screen that rendered only what was
 * stored would show a new learner an empty table and let them conclude they had
 * no notifications, which is the opposite of true.
 *
 * The learner is resolved from the session, so there is no input by which one
 * could ask for another's. That is the whole of this feature's access control
 * and it is the same shape everywhere else in the application.
 */
export class GetNotificationPreferencesUseCase {
  private readonly defaults = new PreferenceDefaults();

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly preferences: INotificationPreferenceRepository,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(input: IGetNotificationPreferencesInput): Promise<IPreferencesView> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const stored = await this.preferences.findByProfile(profile.id);
    const complete = this.defaults.forProfile(profile.id, stored, () => this.ids.next());

    // `toPreferenceViews` drops anything that is not a live channel, which is
    // belt and braces: the defaults service emits only those two, and a stored
    // `email` row from some future migration must not appear either.
    return { preferences: toPreferenceViews([...complete]) };
  }
}
