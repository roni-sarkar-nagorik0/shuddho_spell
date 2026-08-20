export const ID_GENERATOR = Symbol('ID_GENERATOR');

/**
 * Ids made by the application rather than the database.
 *
 * The alternative — letting Postgres fill `gen_random_uuid()` and reading it
 * back — means a use case cannot know what it just created until after the
 * write, and cannot build an object graph that references itself before saving
 * any of it. A lesson session and its first attempt are written together; the
 * attempt needs the session's id while both are still in memory.
 *
 * Injected rather than imported so a test can produce `attempt-1`, `attempt-2`
 * and assert on them instead of matching a UUID pattern.
 */
export interface IIdGenerator {
  readonly next: () => string;
}
