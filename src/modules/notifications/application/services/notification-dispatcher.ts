import { type LearnerProfile } from '@/modules/auth/domain/entities/learner-profile';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { type JsonValue } from '@/modules/shared/domain/value-objects/json-value';
import { copyFor, fill } from '../../domain/data/notification-copy';
import { Notification } from '../../domain/entities/notification';
import { type INotificationPreferenceRepository } from '../../domain/repositories/notification-preference-repository';
import { type INotificationRepository } from '../../domain/repositories/notification-repository';
import { type IPushSubscriptionRepository } from '../../domain/repositories/push-subscription-repository';
import { NotificationPolicy } from '../../domain/services/notification-policy';
import { PreferenceDefaults } from '../../domain/services/preference-defaults';
import { ClockTime } from '../../domain/value-objects/clock-time';
import { type NotificationSeverity } from '../../domain/value-objects/notification-severity';
import { type NotificationType } from '../../domain/value-objects/notification-type';
import { type IInAppNotifier } from '../ports/in-app-notifier';
import { type IPushSender } from '../ports/push-sender';

export interface IDispatchRequest {
  readonly profile: LearnerProfile;
  readonly type: NotificationType;
  readonly severity: NotificationSeverity;
  /** Substituted into the copy for this type. */
  readonly values: Readonly<Record<string, string>>;
  readonly payload: JsonValue;
  /** Where clicking the push should land. */
  readonly url: string;
  /**
   * The window being aimed at — **not** the instant the job ran.
   *
   * It is the idempotency key's third column, so two ticks of the same hourly
   * job must produce the same value here or the key stops working.
   */
  readonly scheduledFor: Date;
}

export const DISPATCH_OUTCOMES = Object.freeze([
  'delivered',
  'already_sent',
  'suppressed',
  'deferred',
] as const);

export type DispatchOutcome = (typeof DISPATCH_OUTCOMES)[number];

export interface IDispatchResult {
  readonly outcome: DispatchOutcome;
  readonly channels: readonly string[];
}

/**
 * The machinery every dispatch shares.
 *
 * Six use cases decide *what* to say and *when* it is worth saying; this
 * decides whether it goes out and gets it there. Written once because the six
 * differ only in their copy, and six copies of "ask the policy, claim the key,
 * write the row, send the push" would end up disagreeing about at least one of
 * those four steps.
 *
 * The order is the whole of the idempotency guarantee:
 *
 *   1. ask the policy — a suppressed notification is **never written**, so
 *      quiet hours do not fill the bell with what the learner asked not to see
 *   2. write the row, which **claims** `(profile_id, type, scheduled_for)`
 *   3. push only if that write created the row
 *
 * A retried tick loses step 2's race, learns it lost from `created: false`, and
 * sends nothing. That is `09-notifications.md`'s "a retried job cannot
 * double-send", and it holds with no coordination between invocations — which
 * matters because there is no process alive between them.
 */
export class NotificationDispatcher {
  private readonly policy = new NotificationPolicy();
  private readonly defaults = new PreferenceDefaults();

  constructor(
    private readonly notifications: INotificationRepository,
    private readonly preferences: INotificationPreferenceRepository,
    private readonly subscriptions: IPushSubscriptionRepository,
    private readonly inApp: IInAppNotifier,
    private readonly push: IPushSender,
    private readonly ids: IIdGenerator,
  ) {}

  async dispatch(request: IDispatchRequest): Promise<IDispatchResult> {
    const { profile } = request;

    const stored = await this.preferences.findByProfile(profile.id);
    const complete = this.defaults.forProfile(profile.id, stored, () => this.ids.next());

    // The learner's own wall clock at the moment being aimed at — never the
    // server's. A UTC+6 learner's quiet hours are their quiet hours.
    const localNow = ClockTime.fromInstant(request.scheduledFor, profile.timezone);
    const decision = this.policy.decide(request.type, complete, localNow);

    if (decision.kind === 'drop') {
      return { outcome: 'suppressed', channels: [] };
    }

    if (decision.kind === 'defer') {
      // Nothing is written. A later tick inside the allowed window aims at a
      // different `scheduledFor` and dispatches normally — writing a row now
      // would claim the key for a send that has not happened.
      return { outcome: 'deferred', channels: [] };
    }

    const copy = copyFor(request.type, profile.uiLanguage);
    const title = fill(copy.title, request.values);
    const body = fill(copy.body, request.values);

    const inserted = await this.inApp.deliver(
      new Notification({
        id: this.ids.next(),
        profileId: profile.id,
        type: request.type,
        title,
        body,
        severity: request.severity,
        payload: request.payload,
        scheduledFor: request.scheduledFor,
        sentAt: null,
        readAt: null,
        channelsDelivered: [],
      }),
    );

    if (!inserted.created) {
      return { outcome: 'already_sent', channels: [] };
    }

    const channels: string[] = ['in_app'];

    if (decision.channels.includes('push')) {
      const sent = await this.sendPush(profile.id, {
        title,
        body,
        url: request.url,
        // Collapses replacements: two "reviews due" pushes show as one, which
        // is what a learner who left a tab open for a day wants.
        tag: request.type,
      });

      if (sent) {
        channels.push('push');
        // `save`, not `deliver`: the row already exists, and `deliver` would go
        // through `insertIfAbsent`, find the key taken, and drop the update on
        // the floor. Recording *which* channels carried it is a fact about the
        // notification, which the repository owns.
        await this.notifications.save(
          inserted.notification.delivered('push', request.scheduledFor),
        );
      }
    }

    return { outcome: 'delivered', channels };
  }

  /**
   * Every browser the learner has, and a failure on one does not stop the rest.
   *
   * `IPushSender` returns outcomes rather than throwing, so a dead endpoint
   * cleans itself up mid-loop and the next subscription still gets its push.
   */
  private async sendPush(
    profileId: string,
    message: {
      readonly title: string;
      readonly body: string;
      readonly url: string;
      readonly tag: string;
    },
  ): Promise<boolean> {
    const browsers = await this.subscriptions.findByProfile(profileId);
    let anySent = false;

    for (const browser of browsers) {
      if ((await this.push.send(browser, message)) === 'sent') {
        anySent = true;
      }
    }

    return anySent;
  }
}
