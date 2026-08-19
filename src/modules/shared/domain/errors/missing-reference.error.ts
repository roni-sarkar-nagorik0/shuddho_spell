/**
 * A write pointed at a row that is not there — a foreign key violation.
 *
 * Distinct from `ConflictError` because the fix is opposite: a conflict means
 * something exists that should not, this means something does not exist that
 * should. An attempt naming a word the content pipeline never seeded lands
 * here, and an operator needs to look at the seed rather than at the learner.
 */
export class MissingReferenceError extends Error {
  constructor(
    readonly what: string,
    detail: string,
  ) {
    super(`${what} refers to something that does not exist: ${detail}`);
    this.name = 'MissingReferenceError';
  }
}
