import { InvalidValueError } from '../errors/invalid-value.error';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const MS_PER_DAY = 86_400_000;

/**
 * A calendar day in the learner's timezone, with no time and no offset.
 *
 * This type exists because the single most-reported bug class in streak and
 * review features is comparing a UTC instant to a local day. A learner in
 * UTC+6 who answers at 23:50 on the 3rd has answered on the 3rd; the server's
 * clock says the 4th, and every rule in `06-spaced-repetition.md` — due dates,
 * streaks, "3 different calendar days" — is written about the learner's answer,
 * not the server's.
 *
 * `review_items.last_correct_on` and `streak_records.last_active_date` are both
 * `date` columns for exactly this reason: the resolution happens once, on the
 * way in, and nothing downstream can get it wrong a second time.
 */
export class LocalDate {
  private constructor(readonly value: string) {}

  /** From an already-resolved `YYYY-MM-DD`, as a `date` column reads back. */
  static of(value: string): LocalDate {
    if (!ISO_DATE.test(value)) {
      throw new InvalidValueError('LocalDate', JSON.stringify(value), 'must be YYYY-MM-DD');
    }

    return new LocalDate(value);
  }

  /**
   * The calendar day an instant falls on **for this learner**.
   *
   * `en-CA` because it formats as `YYYY-MM-DD`; the alternative is assembling
   * the parts by hand and getting the zero-padding wrong. The zone comes from
   * the profile, never from the process.
   */
  static fromInstant(instant: Date, timezone: string): LocalDate {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);

    return LocalDate.of(formatted);
  }

  equals(other: LocalDate): boolean {
    return this.value === other.value;
  }

  /**
   * Whole days from this date to a later one. Both sides are parsed as UTC
   * midnight, which is what makes the arithmetic exact — these are calendar
   * days, and a DST transition must not turn a gap of one into a gap of zero.
   */
  daysUntil(other: LocalDate): number {
    const from = Date.parse(`${this.value}T00:00:00Z`);
    const to = Date.parse(`${other.value}T00:00:00Z`);

    return Math.round((to - from) / MS_PER_DAY);
  }

  isBefore(other: LocalDate): boolean {
    return this.value < other.value;
  }
}
