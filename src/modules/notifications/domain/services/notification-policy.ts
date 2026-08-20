import { type NotificationPreference } from '../entities/notification-preference';
import { type ClockTime } from '../value-objects/clock-time';
import { isLiveChannel, type LiveChannel } from '../value-objects/notification-channel';
import { type NotificationType } from '../value-objects/notification-type';

/**
 * Which types wait for the quiet window to end, and which are simply dropped.
 *
 * The split is about whether the news keeps. An exam result is still worth
 * hearing at seven in the morning; a "you have 12 reviews due today" delivered
 * nine hours late is noise, and tomorrow's is already coming. Getting this
 * wrong in the deferring direction is how a learner wakes to eleven stale
 * notifications, which is how the permission gets revoked.
 */
const DEFERRABLE: readonly NotificationType[] = Object.freeze([
  'exam_result',
  'exam_unlocked',
  'milestone_reached',
  'weekly_report',
  'product_update',
]);

export type NotificationDecision =
  | { readonly kind: 'deliver'; readonly channels: readonly LiveChannel[] }
  | {
      readonly kind: 'defer';
      readonly channels: readonly LiveChannel[];
      /** The learner's local time at which the quiet window ends. */
      readonly until: ClockTime;
    }
  | { readonly kind: 'drop'; readonly reason: DropReason };

export const DROP_REASONS = Object.freeze([
  'no_enabled_channel',
  'quiet_hours',
] as const);

export type DropReason = (typeof DROP_REASONS)[number];

/**
 * The one service that decides whether a notification goes out.
 *
 * Every dispatch use case asks it, and none of them re-reads a preference or
 * re-checks an hour. That is the point: "does this learner want this, on this
 * channel, at this moment" is one question, and six answers to it would drift
 * within a month.
 *
 * Pure. The local time arrives as an argument rather than being computed here,
 * so the midnight-spanning case `09-notifications.md` calls "the classic
 * off-by-one" is a table of times rather than a test that has to wait until
 * two in the morning.
 */
export class NotificationPolicy {
  decide(
    type: NotificationType,
    preferences: readonly NotificationPreference[],
    localNow: ClockTime,
  ): NotificationDecision {
    const forType = preferences.filter((preference) => preference.type === type);

    // `email` is filtered out **here**, before anything else looks at it: a
    // preference row asking for it is never selected and no send is attempted.
    // There is no mailer to attempt one with, by design.
    const live = forType.filter(
      (preference) => preference.enabled && isLiveChannel(preference.channel),
    );

    if (live.length === 0) {
      return { kind: 'drop', reason: 'no_enabled_channel' };
    }

    const audible = live.filter((preference) => !preference.isQuietAt(localNow));

    if (audible.length > 0) {
      return { kind: 'deliver', channels: channelsOf(audible) };
    }

    if (!DEFERRABLE.includes(type)) {
      return { kind: 'drop', reason: 'quiet_hours' };
    }

    // Every live channel is quiet. Defer to the earliest window end, so a
    // learner with different quiet hours per channel hears it as soon as any
    // one of them opens rather than when the last one does.
    const until = earliestWindowEnd(live);

    return until === null
      ? { kind: 'deliver', channels: channelsOf(live) }
      : { kind: 'defer', channels: channelsOf(live), until };
  }

  /**
   * Whether an hourly tick is the one that should fire this learner's reminder.
   *
   * The comparison is on the **hour in their timezone**, which is the whole of
   * `09`'s scheduling rule: a UTC+6 learner with a 20:00 reminder is served by
   * the tick where their local hour is 20, whichever server hour that is.
   * Minutes are ignored deliberately — the job runs hourly, so a reminder set
   * for 20:30 fires at 20:00 rather than not at all.
   */
  isReminderHour(preference: NotificationPreference, localNow: ClockTime): boolean {
    const reminder = preference.reminderTime;

    return reminder !== null && reminder.hour === localNow.hour;
  }
}

function channelsOf(preferences: readonly NotificationPreference[]): readonly LiveChannel[] {
  const channels: LiveChannel[] = [];

  for (const preference of preferences) {
    if (isLiveChannel(preference.channel) && !channels.includes(preference.channel)) {
      channels.push(preference.channel);
    }
  }

  return channels;
}

function earliestWindowEnd(preferences: readonly NotificationPreference[]): ClockTime | null {
  let earliest: ClockTime | null = null;

  for (const preference of preferences) {
    const end = preference.quietHoursEnd;

    if (end !== null && (earliest === null || end.minutesSinceMidnight < earliest.minutesSinceMidnight)) {
      earliest = end;
    }
  }

  return earliest;
}
