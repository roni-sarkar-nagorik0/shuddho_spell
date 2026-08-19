import { type StreakRecord } from '../entities/streak-record';

export const STREAK_REPOSITORY = Symbol('STREAK_REPOSITORY');

export interface IStreakRepository {
  readonly findByProfile: (profileId: string) => Promise<StreakRecord | null>;
  readonly save: (record: StreakRecord) => Promise<StreakRecord>;
}
