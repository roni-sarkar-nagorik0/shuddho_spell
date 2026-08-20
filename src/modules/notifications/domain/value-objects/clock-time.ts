import { InvalidValueError } from '@/modules/shared/domain/errors/invalid-value.error';

const PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/u;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

/**
 * A time of day with no date and no zone — Postgres `time`.
 *
 * Quiet hours and reminder times are stored as `time` in 005 precisely because
 * they are **not** instants: "22:00" means ten at night wherever the learner
 * is, and pinning it to a zone at rest would make a learner who flies to London
 * start getting reminders at 3am.
 *
 * Comparison is by minutes since midnight, which is the only arithmetic the
 * policy needs and the only one that behaves across a wrapping window.
 */
export class ClockTime {
  private constructor(readonly minutesSinceMidnight: number) {}

  static of(value: string): ClockTime {
    const match = PATTERN.exec(value.trim());
    const hours = Number(match?.[1]);
    const minutes = Number(match?.[2]);

    if (
      match === null ||
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours >= HOURS_PER_DAY ||
      minutes >= MINUTES_PER_HOUR
    ) {
      throw new InvalidValueError('ClockTime', JSON.stringify(value), 'must be HH:MM or HH:MM:SS');
    }

    return new ClockTime(hours * MINUTES_PER_HOUR + minutes);
  }

  /**
   * The wall-clock time an instant shows **for this learner**.
   *
   * The zone comes from their profile, never from the process. This is the same
   * discipline `LocalDate.fromInstant` exists for, applied to the other half of
   * the clock: an hourly job that selected on the server's hour would send a
   * UTC+6 learner their 20:00 reminder at 2am, which is precisely the bug
   * `09-notifications.md` names as "the part that is usually wrong".
   *
   * `en-GB` with `hourCycle: 'h23'`, so midnight is `00` and not `24`.
   */
  static fromInstant(instant: Date, timezone: string): ClockTime {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(instant);

    return ClockTime.of(formatted);
  }

  static fromMinutes(minutes: number): ClockTime {
    return new ClockTime(
      ((minutes % (HOURS_PER_DAY * MINUTES_PER_HOUR)) + HOURS_PER_DAY * MINUTES_PER_HOUR) %
        (HOURS_PER_DAY * MINUTES_PER_HOUR),
    );
  }

  get hour(): number {
    return Math.floor(this.minutesSinceMidnight / MINUTES_PER_HOUR);
  }

  get minute(): number {
    return this.minutesSinceMidnight % MINUTES_PER_HOUR;
  }

  /** `HH:MM:SS`, the shape Postgres `time` reads back. */
  toString(): string {
    const pad = (value: number): string => String(value).padStart(2, '0');

    return `${pad(this.hour)}:${pad(this.minute)}:00`;
  }

  equals(other: ClockTime): boolean {
    return this.minutesSinceMidnight === other.minutesSinceMidnight;
  }
}
