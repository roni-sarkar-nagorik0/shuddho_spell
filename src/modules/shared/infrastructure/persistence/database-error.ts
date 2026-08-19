/**
 * Postgres codes worth telling apart. `03-database.md` names these three.
 */
export const PG_CODES = Object.freeze({
  /** unique_violation — a race resolving, usually, rather than a failure. */
  UniqueViolation: '23505',
  /** foreign_key_violation — a reference to something that is not there. */
  ForeignKeyViolation: '23503',
  /** serialization_failure — retryable exactly once. */
  SerializationFailure: '40001',
} as const);

export type PgCode = (typeof PG_CODES)[keyof typeof PG_CODES];

/**
 * A database failure with its code intact.
 *
 * The code is the whole point. A repository that catches `Error` and reads the
 * message is one string change away from treating a unique violation — which is
 * frequently a race resolving correctly — as an outage. Carrying the code lets
 * the one place that knows what a conflict *means* on this table decide.
 */
export class DatabaseError extends Error {
  constructor(
    readonly operation: string,
    readonly code: string | null,
    message: string,
  ) {
    super(`${operation}: ${message}`);
    this.name = 'DatabaseError';
  }

  is(code: PgCode): boolean {
    return this.code === code;
  }
}
