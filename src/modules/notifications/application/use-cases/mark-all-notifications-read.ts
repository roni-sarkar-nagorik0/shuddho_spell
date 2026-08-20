import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type INotificationRepository } from '../../domain/repositories/notification-repository';
import { type IUnreadCount } from './mark-notification-read';

export interface IMarkAllNotificationsReadInput {
  readonly userId: string;
}

/**
 * Clears the badge.
 *
 * Scoped to the session's profile with no id in the input at all, which is the
 * strongest form this check takes anywhere: there is nothing to get wrong,
 * because there is nothing to pass.
 */
export class MarkAllNotificationsReadUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly notifications: INotificationRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: IMarkAllNotificationsReadInput): Promise<IUnreadCount> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    await this.notifications.markAllRead(profile.id, this.clock.now());

    return { unreadCount: await this.notifications.countUnread(profile.id) };
  }
}
