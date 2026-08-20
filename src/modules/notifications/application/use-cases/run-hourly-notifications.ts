import { type LearnerProfile } from '@/modules/auth/domain/entities/learner-profile';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IStreakRepository } from '@/modules/progress/domain/repositories/streak-repository';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { type INotificationPreferenceRepository } from '../../domain/repositories/notification-preference-repository';
import { NotificationPolicy } from '../../domain/services/notification-policy';
import { PreferenceDefaults } from '../../domain/services/preference-defaults';
import { ClockTime } from '../../domain/value-objects/clock-time';
import {
  type SendDailyReminderUseCase,
  type SendReviewItemsDueUseCase,
  type SendStreakAtRiskUseCase,
} from './dispatch-use-cases';

/** How many learners one tick will look at. See `listAll`'s note. */
const ROSTER_LIMIT = 5000;

/**
 * The local hour at which a live streak is warned about.
 *
 * Late enough that the learner has had their day, early enough that fifteen
 * minutes still fits before midnight. Quiet hours can still suppress it —
 * somebody who sleeps at nine has said they would rather lose the streak than
 * be woken, and the policy honours that.
 */
const STREAK_WARNING_HOUR = 21;

const MILLISECONDS_PER_HOUR = 3_600_000;

export interface IHourlyRunResult {
  readonly scheduledFor: string;
  readonly examined: number;
  readonly dailyReminders: number;
  readonly reviewNudges: number;
  readonly streakWarnings: number;
  /** Learners whose dispatch threw. Reported, never swallowed. */
  readonly failed: readonly string[];
}

/**
 * The hourly tick.
 *
 * Two things make this correct and both are easy to get wrong.
 *
 * **It selects on the learner's local hour, not the server's.** `09` calls
 * scheduling "the part that is usually wrong" and gives the exact failure: a
 * job that runs once at a server-local hour sends a UTC+6 learner their 20:00
 * reminder at 2am. So the job runs *every* hour and asks each learner whether
 * this is their hour — which is a question only their timezone can answer.
 *
 * **Every notification in a tick shares one `scheduledFor`: the top of the
 * hour.** Not `now()`. That is what makes 005's unique key work across retries:
 * a platform that re-invokes a timed-out job at 20:03 having already sent half
 * the batch at 20:01 computes the same 20:00 for everyone, so the half already
 * sent collide and the half not sent go out. Using `now()` would give every
 * retry a fresh key and double-send the lot.
 */
export class RunHourlyNotificationsUseCase {
  private readonly policy = new NotificationPolicy();
  private readonly defaults = new PreferenceDefaults();

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly preferences: INotificationPreferenceRepository,
    private readonly reviews: IReviewItemRepository,
    private readonly streaks: IStreakRepository,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
    private readonly dailyReminder: SendDailyReminderUseCase,
    private readonly reviewsDue: SendReviewItemsDueUseCase,
    private readonly streakAtRisk: SendStreakAtRiskUseCase,
  ) {}

  async execute(): Promise<IHourlyRunResult> {
    const scheduledFor = topOfHour(this.clock.now());
    const roster = await this.profiles.listAll(ROSTER_LIMIT);

    const failed: string[] = [];
    let dailyReminders = 0;
    let reviewNudges = 0;
    let streakWarnings = 0;

    for (const profile of roster) {
      try {
        const local = ClockTime.fromInstant(scheduledFor, profile.timezone);
        const sent = await this.forLearner(profile, local, scheduledFor);

        dailyReminders += sent.reminder;
        reviewNudges += sent.reviews;
        streakWarnings += sent.streak;
      } catch {
        // Per learner, and reported. A tick that dies on the eleventh profile
        // leaves everyone after them without a reminder for an hour, and the
        // whole point of this job is the people it reaches.
        failed.push(profile.id);
      }
    }

    return {
      scheduledFor: scheduledFor.toISOString(),
      examined: roster.length,
      dailyReminders,
      reviewNudges,
      streakWarnings,
      failed,
    };
  }

  private async forLearner(
    profile: LearnerProfile,
    local: ClockTime,
    scheduledFor: Date,
  ): Promise<{ readonly reminder: number; readonly reviews: number; readonly streak: number }> {
    const stored = await this.preferences.findByProfile(profile.id);
    // A real generator, not the profile id repeated: these rows are read-only
    // here, but an id that collides is a trap for whoever writes the next
    // caller that does persist them.
    const complete = this.defaults.forProfile(profile.id, stored, () => this.ids.next());

    const reminderPreference = complete.find(
      (preference) => preference.type === 'daily_reminder' && preference.channel === 'in_app',
    );

    const isReminderHour =
      reminderPreference !== undefined &&
      this.policy.isReminderHour(reminderPreference, local);

    let reminder = 0;
    let reviews = 0;
    let streak = 0;

    if (isReminderHour) {
      const result = await this.dailyReminder.execute({
        profile,
        dayIndex: profile.currentDayIndex.value,
        scheduledFor,
      });

      reminder = result.outcome === 'delivered' ? 1 : 0;

      // Only when there is something to review. A nudge saying "0 words are due"
      // is the fastest way to teach somebody to ignore the app's notifications.
      const dueCount = await this.reviews.countDue(profile.id, scheduledFor);

      if (dueCount > 0) {
        const nudge = await this.reviewsDue.execute({ profile, dueCount, scheduledFor });

        reviews = nudge.outcome === 'delivered' ? 1 : 0;
      }
    }

    if (local.hour === STREAK_WARNING_HOUR) {
      streak = await this.warnStreak(profile, scheduledFor);
    }

    return { reminder, reviews, streak };
  }

  /**
   * Warns only a streak that is **live and untouched today**.
   *
   * `lastActiveDate` is a `LocalDate` in the learner's own timezone, so "today"
   * means their today. Somebody who has already practised is not at risk, and
   * telling them they are would be the app being wrong about the one number it
   * is asking them to care about.
   */
  private async warnStreak(profile: LearnerProfile, scheduledFor: Date): Promise<number> {
    const record = await this.streaks.findByProfile(profile.id);

    if (record === null || record.currentStreak === 0) {
      return 0;
    }

    const today = LocalDate.fromInstant(scheduledFor, profile.timezone);

    if (record.lastActiveDate !== null && record.lastActiveDate.equals(today)) {
      return 0;
    }

    const result = await this.streakAtRisk.execute({
      profile,
      streakDays: record.currentStreak,
      scheduledFor,
    });

    return result.outcome === 'delivered' ? 1 : 0;
  }
}

/**
 * The top of the hour the instant falls in.
 *
 * The idempotency key's third column, and the reason a retry is a no-op rather
 * than a second send.
 */
function topOfHour(instant: Date): Date {
  return new Date(Math.floor(instant.getTime() / MILLISECONDS_PER_HOUR) * MILLISECONDS_PER_HOUR);
}
