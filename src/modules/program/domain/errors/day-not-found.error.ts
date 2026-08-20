import { type Track } from '@/modules/shared/domain/value-objects/track';

/**
 * The track has no such day.
 *
 * Distinct from `DayLockedError` on purpose: locked means "not yet", missing
 * means the content pipeline never shipped it. An operator seeing the second
 * needs to go and look at Phase 9's seed, not at the learner's position.
 */
export class DayNotFoundError extends Error {
  constructor(
    readonly track: Track,
    readonly dayIndex: number,
  ) {
    super(`${track} has no day ${String(dayIndex)}`);
    this.name = 'DayNotFoundError';
  }
}
