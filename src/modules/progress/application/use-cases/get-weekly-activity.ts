import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IAttemptRepository } from '@/modules/lessons/domain/repositories/attempt-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { type IActivityDay, type IWeeklyActivity } from '../dto/weekly-activity';

export interface IGetWeeklyActivityInput {
  readonly userId: string;
}

const DAYS = 7;

/**
 * How much work happened, each day, for the last week.
 *
 * The window is **seven local days ending today in the learner's timezone**,
 * not a rolling 168 hours: a learner in Dhaka comparing "yesterday" against a
 * chart drawn in UTC sees their evening session filed under the wrong bar.
 *
 * `findByProfile` is capped, so the read is bounded — a learner with fifty
 * thousand attempts pays for the most recent slice, not the archive. That cap
 * is also the honest limit of this panel: an extraordinarily heavy week could
 * push the oldest day past it, which understates that bar rather than
 * inventing one.
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

    const recent = await this.attempts.findByProfile(profile.id, RECENT_ATTEMPT_CAP);

    const today = LocalDate.fromInstant(this.clock.now(), profile.timezone);
    const window = buildWindow(today);

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
 * Enough to cover a very heavy week without reading an archive. Two hundred
 * answers a day for seven days is far beyond any real session.
 */
const RECENT_ATTEMPT_CAP = 1400;

interface IBucket {
  readonly attempts: number;
  readonly correct: number;
  readonly latencyMs: number;
}

/** Seven zeroed days, oldest first — so a quiet day is a gap in the chart, not a missing bar. */
function buildWindow(today: LocalDate): Map<string, IBucket> {
  const window = new Map<string, IBucket>();

  for (let offset = DAYS - 1; offset >= 0; offset -= 1) {
    window.set(today.minusDays(offset).value, { attempts: 0, correct: 0, latencyMs: 0 });
  }

  return window;
}
