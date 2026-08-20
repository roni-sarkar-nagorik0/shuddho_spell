import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type INotificationRepository } from '../../domain/repositories/notification-repository';
import { type INotificationFeed } from '../dto/notification-views';

/** What the bell popover shows. A page, not a lifetime. */
const FEED_LIMIT = 30;

export interface IListNotificationsInput {
  readonly userId: string;
}

/**
 * The bell's feed and its badge.
 *
 * Two reads, and the count is a `count(*)` rather than the length of the feed:
 * a learner with sixty unread notifications and a thirty-row page would
 * otherwise see a badge saying 30, which is both wrong and reassuring in the
 * wrong direction.
 */
export class ListNotificationsUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly notifications: INotificationRepository,
  ) {}

  async execute(input: IListNotificationsInput): Promise<INotificationFeed> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const [feed, unreadCount] = await Promise.all([
      this.notifications.findByProfile(profile.id, FEED_LIMIT),
      this.notifications.countUnread(profile.id),
    ]);

    return {
      notifications: feed.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        severity: notification.severity,
        payload: notification.payload,
        scheduledFor: notification.scheduledFor.toISOString(),
        sentAt: notification.sentAt?.toISOString() ?? null,
        readAt: notification.readAt?.toISOString() ?? null,
      })),
      unreadCount,
    };
  }
}
