import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type Notification } from '../../../domain/entities/notification';
import {
  type INotificationInsert,
  type INotificationRepository,
} from '../../../domain/repositories/notification-repository';
import {
  NOTIFICATION_COLUMNS,
  toNotification,
  toNotifications,
  toNotificationRow,
} from '../../mappers/notification.mapper';

const TABLE = 'notifications';

export class SupabaseNotificationRepository implements INotificationRepository {
  constructor(private readonly db: IDatabase) {}

  async findById(id: string): Promise<Notification | null> {
    return toNotification(
      await this.db.selectOne({ table: TABLE, columns: NOTIFICATION_COLUMNS, eq: { id } }),
    );
  }

  async findByProfile(profileId: string, limit: number): Promise<readonly Notification[]> {
    return toNotifications(
      await this.db.select({
        table: TABLE,
        columns: NOTIFICATION_COLUMNS,
        eq: { profile_id: profileId },
        orderBy: { column: 'scheduled_for', ascending: false },
        limit,
      }),
    );
  }

  async countUnread(profileId: string): Promise<number> {
    return this.db.count({
      table: TABLE,
      columns: 'id',
      eq: { profile_id: profileId, read_at: null },
    });
  }

  /**
   * `on conflict do nothing`, then read back what is actually stored.
   *
   * `ignoreDuplicates: true` is the whole point here and the opposite of the
   * choice every other upsert in this codebase makes. A conflict means another
   * tick already claimed this `(profile_id, type, scheduled_for)`, and updating
   * would overwrite a notification that may already have been **sent and read**
   * — turning a duplicate-delivery bug into a data-loss one.
   *
   * The read-back is what tells the caller which of them won: if the stored id
   * is not the one we tried to write, we lost, and the winner does the sending.
   */
  async insertIfAbsent(notification: Notification): Promise<INotificationInsert> {
    await this.db.upsert(TABLE, [toNotificationRow(notification)], {
      onConflict: 'profile_id,type,scheduled_for',
      ignoreDuplicates: true,
    });

    const stored = toNotification(
      await this.db.selectOne({
        table: TABLE,
        columns: NOTIFICATION_COLUMNS,
        eq: {
          profile_id: notification.profileId,
          type: notification.type,
          scheduled_for: notification.scheduledFor.toISOString(),
        },
      }),
    );

    // A row that vanished between the write and the read is not something to
    // paper over with the in-memory copy: the caller would then "deliver" a
    // notification nobody can read later.
    if (stored === null) {
      return { notification, created: false };
    }

    return { notification: stored, created: stored.id === notification.id };
  }

  async save(notification: Notification): Promise<Notification> {
    await this.db.update(TABLE, toNotificationRow(notification), { id: notification.id });

    return notification;
  }

  /**
   * Marks read only what has actually been **sent**.
   *
   * 005's `notifications_read_implies_sent` refuses a read row with no
   * `sent_at`, and it is right to: a queued notification is not something the
   * learner has seen. A single blanket `update … where profile_id = X` would
   * therefore fail outright the first time a delivery had failed and left a row
   * queued — so this reads the unread rows, drops the queued ones, and writes
   * the rest.
   *
   * That is one write per row rather than one statement, and it is the honest
   * trade: `IDatabase` expresses equality filters, and "sent_at is not null" is
   * not one. The count is the learner's unread total, which the bell caps at a
   * page in every screen that calls this.
   */
  async markAllRead(profileId: string, now: Date): Promise<number> {
    const unread = toNotifications(
      await this.db.select({
        table: TABLE,
        columns: NOTIFICATION_COLUMNS,
        eq: { profile_id: profileId, read_at: null },
      }),
    ).filter((notification) => !notification.isQueued());

    for (const notification of unread) {
      await this.save(notification.read(now));
    }

    return unread.length;
  }
}
