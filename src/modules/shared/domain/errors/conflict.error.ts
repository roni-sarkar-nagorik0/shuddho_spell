/**
 * Something already exists that this write cannot coexist with.
 *
 * The typed shape of a unique violation. It maps to 409, not 500 — a conflict
 * is a fact about the request, and the caller can often resolve it by reading
 * what is already there.
 */
export class ConflictError extends Error {
  constructor(
    readonly what: string,
    detail: string,
  ) {
    super(`${what} already exists: ${detail}`);
    this.name = 'ConflictError';
  }
}
