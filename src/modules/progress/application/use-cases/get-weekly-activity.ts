import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IAttemptRepository } from '@/modules/lessons/domain/repositories/attempt-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { type IActivityDay, type IWeeklyActivity } from '../dto/weekly-activity';

export interface IGetWeeklyActivityInput {
  readonly userId: string;
  /** How many local days to cover, ending today. Defaults to a week. */
  readonly days?: number;
}

const DEFAULT_DAYS = 7;

/** A quarter. Longer than this and the attempt cap starts truncating the oldest bars. */
const MAX_DAYS = 120;

/**
 * How much work happened, each day, for the last week.
 *
 * The window is **local days ending today in the learner's timezone**, not a
 * rolling span of hours: a learner in Dhaka comparing "yesterday" against a
 * chart drawn in UTC sees their evening session filed under the wrong bar.
 * The dashboard asks for seven, `/progress` for a quarter.
 *
 * `findByProfile` is capped, so the read is bounded — a learner with fifty
 * thousand attempts pays for the most recent slice, not the archive.
 */
export class GetWeeklyActivityUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly attempts: IAttemptRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: IGetWeeklyActivityInput): Promise<IWeeklyActivity> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const dayCount = Math.min(MAX_DAYS, Math.max(1, input.days ?? DEFAULT_DAYS));
    const recent = await this.attempts.findByProfile(profile.id, attemptCapFor(dayCount));

    const today = LocalDate.fromInstant(this.clock.now(), profile.timezone);
    const window = buildWindow(today, dayCount);

    for (const attempt of recent) {
      const day = LocalDate.fromInstant(attempt.createdAt, profile.timezone).value;
      const bucket = window.get(day);

      if (bucket === undefined) {
        continue;
      }

      window.set(day, {
        attempts: bucket.attempts + 1,
        correct: bucket.correct + (attempt.isCorrect ? 1 : 0),
        latencyMs: bucket.latencyMs + (attempt.latencyMs ?? 0),
      });
    }

    const days: readonly IActivityDay[] = [...window.entries()].map(([date, bucket]) => ({
      date,
      attempts: bucket.attempts,
      correct: bucket.correct,
      accuracy: bucket.attempts === 0 ? null : bucket.correct / bucket.attempts,
      minutes: Math.round(bucket.latencyMs / 60_000),
    }));

    return {
      days,
      totalAttempts: days.reduce((total, day) => total + day.attempts, 0),
      totalMinutes: days.reduce((total, day) => total + day.minutes, 0),
    };
  }
}

/**
 * Two hundred answers a day is far beyond any real session, so this covers the
 * window without reading an archive — and it is a **cap**, which is the honest
 * limit of the panel: an extraordinarily heavy stretch could push the oldest
 * day past it, understating that bar rather than inventing one.
 */
function attemptCapFor(days: number): number {
  return days * 200;
}

interface IBucket {
  readonly attempts: number;
  readonly correct: number;
  readonly latencyMs: number;
}

/** Zeroed days, oldest first — so a quiet day is a gap in the chart, not a missing bar. */
function buildWindow(today: LocalDate, days: number): Map<string, IBucket> {
  const window = new Map<string, IBucket>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    window.set(today.minusDays(offset).value, { attempts: 0, correct: 0, latencyMs: 0 });
  }

  return window;
}
