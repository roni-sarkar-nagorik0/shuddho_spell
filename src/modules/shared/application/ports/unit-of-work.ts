export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

/**
 * One transaction boundary around work that must not half-happen.
 *
 * Completing a lesson writes an attempt, updates the session, moves review
 * items, recalculates mastery and touches the streak. A failure between the
 * third and the fourth leaves a learner whose review queue advanced but whose
 * mastery did not — silent, permanent, and invisible until the numbers stop
 * adding up weeks later.
 *
 * The callback shape rather than `begin()`/`commit()`: there is no way to
 * forget the commit, and no way to leave a transaction open by returning early
 * from the middle of a use case.
 */
export interface IUnitOfWork {
  readonly run: <T>(work: () => Promise<T>) => Promise<T>;
}
