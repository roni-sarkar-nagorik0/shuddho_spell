// @vitest-environment node
/**
 * The notification guarantees `09-notifications.md` asks to be proven by test,
 * run against the real dispatcher over an in-memory world.
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). F8.8's entire
 * deliverable is "**proven by test**" — the mechanism itself shipped with F8.4
 * and F8.6 — so there is nothing else to build for it.
 *
 * The fake notification store **enforces the unique key the way Postgres
 * does**. That is the whole reason this suite means anything: a fake that
 * cheerfully accepted a second row would prove that the code calls a method,
 * not that a retry cannot double-send.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { makeLearnerProfile } from '@/modules/auth/domain/entities/learner-profile.fixture';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { NotificationWriter } from '../infrastructure/adapters/notification-writer';
import { type Notification } from '../domain/entities/notification';
import { NotificationPreference } from '../domain/entities/notification-preference';
import { PushSubscription } from '../domain/entities/push-subscription';
import {
  type INotificationInsert,
  type INotificationRepository,
} from '../domain/repositories/notification-repository';
import { type INotificationPreferenceRepository } from '../domain/repositories/notification-preference-repository';
import { type IPushSubscriptionRepository } from '../domain/repositories/push-subscription-repository';
import { ClockTime } from '../domain/value-objects/clock-time';
import { type NotificationChannel } from '../domain/value-objects/notification-channel';
import { type NotificationType } from '../domain/value-objects/notification-type';
import { type IPushMessage, type IPushSender, type PushResult } from './ports/push-sender';
import { NotificationDispatcher } from './services/notification-dispatcher';

/** 20:00 in Asia/Dhaka (UTC+6) is 14:00 UTC. The doc's own example. */
const AT_2000_DHAKA = new Date('2026-08-20T14:00:00.000Z');
/** 02:00 in Asia/Dhaka is 20:00 UTC the day before. */
const AT_0200_DHAKA = new Date('2026-08-19T20:00:00.000Z');

const profile = makeLearnerProfile({
  id: 'profile-1',
  userId: 'user-1',
  timezone: 'Asia/Dhaka',
  uiLanguage: 'en',
});

class CountingIds implements IIdGenerator {
  private n = 0;

  next(): string {
    this.n += 1;

    return `id-${String(this.n)}`;
  }
}

/**
 * An in-memory `notifications` table that refuses a duplicate
 * `(profile_id, type, scheduled_for)` exactly as 005's constraint does.
 */
class FakeNotifications implements INotificationRepository {
  readonly rows: Notification[] = [];

  private key(profileId: string, type: NotificationType, scheduledFor: Date): string {
    return `${profileId}|${type}|${scheduledFor.toISOString()}`;
  }

  findById(id: string): Promise<Notification | null> {
    return Promise.resolve(this.rows.find((row) => row.id === id) ?? null);
  }

  findByProfile(profileId: string, limit: number): Promise<readonly Notification[]> {
    return Promise.resolve(this.rows.filter((row) => row.profileId === profileId).slice(0, limit));
  }

  countUnread(profileId: string): Promise<number> {
    return Promise.resolve(
      this.rows.filter((row) => row.profileId === profileId && row.isUnread()).length,
    );
  }

  insertIfAbsent(notification: Notification): Promise<INotificationInsert> {
    const wanted = this.key(notification.profileId, notification.type, notification.scheduledFor);
    const existing = this.rows.find(
      (row) => this.key(row.profileId, row.type, row.scheduledFor) === wanted,
    );

    if (existing !== undefined) {
      // `on conflict do nothing`, then read back what is stored.
      return Promise.resolve({ notification: existing, created: false });
    }

    this.rows.push(notification);

    return Promise.resolve({ notification, created: true });
  }

  save(notification: Notification): Promise<Notification> {
    const index = this.rows.findIndex((row) => row.id === notification.id);

    if (index >= 0) {
      this.rows[index] = notification;
    }

    return Promise.resolve(notification);
  }

  markAllRead(): Promise<number> {
    return Promise.resolve(0);
  }
}

class RecordingPush implements IPushSender {
  readonly sent: IPushMessage[] = [];

  send(_subscription: PushSubscription, message: IPushMessage): Promise<PushResult> {
    this.sent.push(message);

    return Promise.resolve('sent');
  }
}

function preference(
  type: NotificationType,
  channel: NotificationChannel,
  quiet: readonly [string, string] | null,
): NotificationPreference {
  return new NotificationPreference({
    id: `${type}-${channel}`,
    profileId: profile.id,
    type,
    channel,
    enabled: true,
    quietHoursStart: quiet === null ? null : ClockTime.of(quiet[0]),
    quietHoursEnd: quiet === null ? null : ClockTime.of(quiet[1]),
    reminderTime: ClockTime.of('20:00'),
  });
}

function world(stored: readonly NotificationPreference[]): {
  readonly dispatcher: NotificationDispatcher;
  readonly notifications: FakeNotifications;
  readonly push: RecordingPush;
} {
  const notifications = new FakeNotifications();
  const push = new RecordingPush();

  const preferences: INotificationPreferenceRepository = {
    findByProfile: () => Promise.resolve(stored),
    upsertMany: (rows) => Promise.resolve(rows),
  };

  const subscriptions: IPushSubscriptionRepository = {
    findByProfile: () =>
      Promise.resolve([
        new PushSubscription({
          id: 'sub-1',
          profileId: profile.id,
          endpoint: 'https://push.example/abc',
          keys: { p256dh: 'k', auth: 'a' },
          userAgent: null,
          createdAt: new Date(),
        }),
      ]),
    upsert: (s) => Promise.resolve(s),
    deleteByEndpoint: () => Promise.resolve(),
  };

  return {
    dispatcher: new NotificationDispatcher(
      notifications,
      preferences,
      subscriptions,
      new NotificationWriter(notifications),
      push,
      new CountingIds(),
    ),
    notifications,
    push,
  };
}

const reminder = {
  type: 'daily_reminder',
  severity: 'info',
  values: { day: '8' },
  payload: {},
  url: '/lesson/8',
} as const;

describe('a retried dispatch produces one row and one send', () => {
  let scene: ReturnType<typeof world>;

  beforeEach(() => {
    scene = world([
      preference('daily_reminder', 'in_app', null),
      preference('daily_reminder', 'push', null),
    ]);
  });

  it('sends once when the same tick runs twice', async () => {
    const first = await scene.dispatcher.dispatch({
      ...reminder,
      profile,
      scheduledFor: AT_2000_DHAKA,
    });
    const second = await scene.dispatcher.dispatch({
      ...reminder,
      profile,
      scheduledFor: AT_2000_DHAKA,
    });

    expect(first.outcome).toBe('delivered');
    expect(second.outcome).toBe('already_sent');
    expect(scene.notifications.rows).toHaveLength(1);
    expect(scene.push.sent).toHaveLength(1);
  });

  it('sends again next hour, because that is a different window', async () => {
    await scene.dispatcher.dispatch({ ...reminder, profile, scheduledFor: AT_2000_DHAKA });
    await scene.dispatcher.dispatch({
      ...reminder,
      profile,
      scheduledFor: new Date(AT_2000_DHAKA.getTime() + 3_600_000),
    });

    // Proof the guard is the *key* and not a blanket "only ever once".
    expect(scene.notifications.rows).toHaveLength(2);
    expect(scene.push.sent).toHaveLength(2);
  });

  it('records both channels on the one row', async () => {
    await scene.dispatcher.dispatch({ ...reminder, profile, scheduledFor: AT_2000_DHAKA });

    expect(scene.notifications.rows[0]?.channelsDelivered).toEqual(['in_app', 'push']);
    expect(scene.notifications.rows[0]?.isQueued()).toBe(false);
  });
});

describe('the policy governs every dispatch', () => {
  it('writes nothing at all inside quiet hours that span midnight', async () => {
    const scene = world([
      preference('daily_reminder', 'in_app', ['22:00', '07:00']),
      preference('daily_reminder', 'push', ['22:00', '07:00']),
    ]);

    const result = await scene.dispatcher.dispatch({
      ...reminder,
      profile,
      scheduledFor: AT_0200_DHAKA,
    });

    expect(result.outcome).toBe('suppressed');
    // Suppressed means suppressed: no row, so the bell does not fill up with
    // what the learner asked not to be shown.
    expect(scene.notifications.rows).toHaveLength(0);
    expect(scene.push.sent).toHaveLength(0);
  });

  it('delivers outside the window on the same preferences', async () => {
    const scene = world([
      preference('daily_reminder', 'in_app', ['22:00', '07:00']),
      preference('daily_reminder', 'push', ['22:00', '07:00']),
    ]);

    const result = await scene.dispatcher.dispatch({
      ...reminder,
      profile,
      scheduledFor: AT_2000_DHAKA,
    });

    expect(result.outcome).toBe('delivered');
    expect(scene.notifications.rows).toHaveLength(1);
  });

  it('sends in-app only when push is switched off', async () => {
    const scene = world([
      preference('daily_reminder', 'in_app', null),
      preference('daily_reminder', 'push', null).withEnabled(false),
    ]);

    const result = await scene.dispatcher.dispatch({
      ...reminder,
      profile,
      scheduledFor: AT_2000_DHAKA,
    });

    expect(result.channels).toEqual(['in_app']);
    expect(scene.push.sent).toHaveLength(0);
  });
});

describe('the email channel is never selected and never attempted', () => {
  it('an email preference does not become a send', async () => {
    // Both live channels off, email on. The only enabled row asks for a channel
    // the application does not have.
    const scene = world([
      preference('daily_reminder', 'in_app', null).withEnabled(false),
      preference('daily_reminder', 'push', null).withEnabled(false),
      preference('daily_reminder', 'email', null),
    ]);

    const result = await scene.dispatcher.dispatch({
      ...reminder,
      profile,
      scheduledFor: AT_2000_DHAKA,
    });

    expect(result.outcome).toBe('suppressed');
    expect(scene.notifications.rows).toHaveLength(0);
    expect(scene.push.sent).toHaveLength(0);
  });

  it('email never appears among the channels of a delivered notification', async () => {
    const scene = world([
      preference('daily_reminder', 'in_app', null),
      preference('daily_reminder', 'push', null),
      preference('daily_reminder', 'email', null),
    ]);

    const result = await scene.dispatcher.dispatch({
      ...reminder,
      profile,
      scheduledFor: AT_2000_DHAKA,
    });

    expect(result.channels).toEqual(['in_app', 'push']);
    expect(scene.notifications.rows[0]?.channelsDelivered).not.toContain('email');
  });
});

describe('the weekly report sends no email', () => {
  it('goes out on the two live channels like everything else', async () => {
    const scene = world([
      preference('weekly_report', 'in_app', null),
      preference('weekly_report', 'push', null),
      preference('weekly_report', 'email', null),
    ]);

    const result = await scene.dispatcher.dispatch({
      profile,
      type: 'weekly_report',
      severity: 'info',
      values: { accuracy: '82', days: '5', mastered: '14' },
      payload: {},
      url: '/progress',
      scheduledFor: AT_2000_DHAKA,
    });

    expect(result.channels).toEqual(['in_app', 'push']);
    expect(scene.push.sent).toHaveLength(1);
  });
});
