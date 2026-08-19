import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';

export interface IStreakRecordProps {
  readonly id: string;
  readonly profileId: string;
  readonly currentStreak: number;
  readonly longestStreak: number;
  /** The learner-local day of the last activity. Null before the first one. */
  readonly lastActiveDate: LocalDate | null;
  readonly freezesRemaining: number;
}

/** One missed day is forgivable if the learner has a freeze left. Two is not. */
const FORGIVABLE_GAP = 2;

/**
 * How many days in a row the learner has shown up.
 *
 * Every comparison here is between **learner-local calendar days**, never
 * between instants. `05-domain-model.md` calls day boundaries "the single
 * most-reported bug class in streak features" and it is right: a learner in
 * UTC+6 finishing at 23:50 has finished on that day, and a server comparing UTC
 * dates would silently break their streak at ten to midnight, every night.
 */
export class StreakRecord {
  readonly id: string;
  readonly profileId: string;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly lastActiveDate: LocalDate | null;
  readonly freezesRemaining: number;

  constructor(props: IStreakRecordProps) {
    this.id = props.id;
    this.profileId = props.profileId;
    this.currentStreak = props.currentStreak;
    this.longestStreak = props.longestStreak;
    this.lastActiveDate = props.lastActiveDate;
    this.freezesRemaining = props.freezesRemaining;
  }

  /**
   * Records that the learner did something today.
   *
   * The four cases, in the order they are checked:
   *
   * 1. **Never active** — the streak starts at 1.
   * 2. **Same local day** — nothing changes. A learner who finishes a lesson
   *    and then a review has not extended a streak twice.
   * 3. **The next local day** — the streak grows.
   * 4. **A gap** — one missed day is forgiven if a freeze is available and
   *    spends it; anything longer starts again at 1.
   *
   * The fifth case has no rule in the spec and needs one: the local day can go
   * **backwards**. A learner active in Dhaka on the 19th who opens the app in
   * New York is on the 18th, and every arithmetic comparison here would read
   * that as a gap of minus one. Treated as case 2 — same day, nothing changes,
   * and `lastActiveDate` is not walked backwards — because the alternative is
   * resetting the streak of somebody who got on a plane.
   */
  registerActivity(at: Date, timezone: string): StreakRecord {
    const today = LocalDate.fromInstant(at, timezone);
    const last = this.lastActiveDate;

    if (last === null) {
      return this.withStreak(1, today);
    }

    const gap = last.daysUntil(today);

    if (gap <= 0) {
      // Same day, or a day the learner has already been credited for after
      // travelling west. Nothing to record and nothing to lose.
      return this;
    }

    if (gap === 1) {
      return this.withStreak(this.currentStreak + 1, today);
    }

    if (gap === FORGIVABLE_GAP && this.freezesRemaining > 0) {
      return new StreakRecord({
        ...this.toProps(),
        currentStreak: this.currentStreak + 1,
        longestStreak: Math.max(this.longestStreak, this.currentStreak + 1),
        lastActiveDate: today,
        freezesRemaining: this.freezesRemaining - 1,
      });
    }

    return this.withStreak(1, today);
  }

  /**
   * Whether the streak is still alive as of a given local day — the question
   * the dashboard asks, and it is not the same as `currentStreak > 0`. A
   * learner last active three days ago still has a stored streak; it is simply
   * over, and saying so is better than showing a number that is about to reset.
   */
  isAliveOn(today: LocalDate): boolean {
    const last = this.lastActiveDate;

    if (last === null) {
      return false;
    }

    return last.daysUntil(today) <= 1;
  }

  private withStreak(currentStreak: number, on: LocalDate): StreakRecord {
    return new StreakRecord({
      ...this.toProps(),
      currentStreak,
      longestStreak: Math.max(this.longestStreak, currentStreak),
      lastActiveDate: on,
    });
  }

  private toProps(): IStreakRecordProps {
    return {
      id: this.id,
      profileId: this.profileId,
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak,
      lastActiveDate: this.lastActiveDate,
      freezesRemaining: this.freezesRemaining,
    };
  }
}
