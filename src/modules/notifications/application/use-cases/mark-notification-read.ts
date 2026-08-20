import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { NotificationNotFoundError } from '../../domain/errors/notification-not-found.error';
import { type INotificationRepository } from '../../domain/repositories/notification-repository';

export interface IMarkNotificationReadInput {
  readonly userId: string;
  readonly notificationId: string;
}

export interface IUnreadCount {
  readonly unreadCount: number;
}

/**
 * Marks one notification read.
 *
 * The ownership check is the feature: the id arrives in the url, so without it
 * any learner could mark — and by marking, confirm the existence of — anybody
 * else's notification. `NotificationNotFoundError` covers both "no such row"
 * and "not yours", because distinguishing them is itself the leak.
 *
 * Reading twice is not an error and does not move the timestamp. "When did I
 * see this" has one answer, and a second click is not a second reading.
 */
export class MarkNotificationReadUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly notifications: INotificationRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: IMarkNotificationReadInput): Promise<IUnreadCount> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const notification = await this.notifications.findById(input.notificationId);

    if (notification === null || notification.profileId !== profile.id) {
      throw new NotificationNotFoundError(input.notificationId);
    }

    if (notification.isUnread()) {
      await this.notifications.save(notification.read(this.clock.now()));
    }

    return { unreadCount: await this.notifications.countUnread(profile.id) };
  }
}
