// @vitest-environment node
/**
 * F5.5's criterion: **each code produces its typed domain error; 40001 retries
 * exactly once.**
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). "Exactly once" is
 * a number, and the two ways to get it wrong are both invisible: no retry means
 * contended writes fail for no reason, and unbounded retry turns a hot row into
 * an outage. Neither shows up in a typecheck.
 */
import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../domain/errors/conflict.error';
import { MissingReferenceError } from '../../domain/errors/missing-reference.error';
import { type IDatabase } from './database';
import { DatabaseError } from './database-error';
import { RetryingDatabase } from './retrying-database';

function failingWith(error: Error, failures = Number.POSITIVE_INFINITY): {
  db: IDatabase;
  calls: () => number;
} {
  let calls = 0;

  const attempt = (): Promise<never[]> => {
    calls += 1;

    if (calls <= failures) {
      // Thrown rather than `Promise.reject(...)` so the rejection reason is
      // statically an Error — the same rule that stops production code
      // rejecting with a string nobody can read a stack out of.
      throw error;
    }

    return Promise.resolve([]);
  };

  const db: IDatabase = {
    select: () => Promise.resolve().then(attempt),
    selectOne: () => Promise.resolve().then(attempt),
    count: () => Promise.resolve().then(attempt).then(() => 0),
    insert: () => Promise.resolve().then(attempt).then(() => undefined),
    upsert: () => Promise.resolve().then(attempt).then(() => undefined),
    update: () => Promise.resolve().then(attempt).then(() => undefined),
    delete: () =>
      Promise.resolve()
        .then(attempt)
        .then(() => undefined),
    rpc: () => Promise.resolve().then(attempt),
  };

  return { db, calls: () => calls };
}

const query = { table: 'attempts', columns: 'id' };

describe('Postgres codes become typed domain errors', () => {
  it('23505 is a conflict', async () => {
    const { db } = failingWith(new DatabaseError('write attempts', '23505', 'duplicate key'));

    await expect(new RetryingDatabase(db).select(query)).rejects.toBeInstanceOf(ConflictError);
  });

  it('23503 is a missing reference', async () => {
    const { db } = failingWith(new DatabaseError('write attempts', '23503', 'no such word'));

    await expect(new RetryingDatabase(db).select(query)).rejects.toBeInstanceOf(
      MissingReferenceError,
    );
  });

  it('anything else stays a DatabaseError and becomes a 500', async () => {
    const { db } = failingWith(new DatabaseError('write attempts', '42501', 'permission denied'));

    await expect(new RetryingDatabase(db).select(query)).rejects.toBeInstanceOf(DatabaseError);
  });

  it('a failure that is not a DatabaseError passes through untouched', async () => {
    const boom = new TypeError('fetch failed');
    const { db } = failingWith(boom);

    await expect(new RetryingDatabase(db).select(query)).rejects.toBe(boom);
  });
});

describe('40001 retries exactly once', () => {
  const serialization = new DatabaseError('write attempts', '40001', 'could not serialize');

  it('succeeds on the retry after one failure', async () => {
    const { db, calls } = failingWith(serialization, 1);

    await expect(new RetryingDatabase(db).select(query)).resolves.toEqual([]);
    expect(calls()).toBe(2);
  });

  it('gives up after the second failure rather than retrying forever', async () => {
    const { db, calls } = failingWith(serialization);

    await expect(new RetryingDatabase(db).select(query)).rejects.toBeInstanceOf(DatabaseError);
    // Two calls: the original and one retry. A third would mean a contended row
    // turns into a queue of clients all retrying at once.
    expect(calls()).toBe(2);
  });

  it('does not retry a conflict — nothing about it will change', async () => {
    const { db, calls } = failingWith(new DatabaseError('write attempts', '23505', 'duplicate'));

    await expect(new RetryingDatabase(db).select(query)).rejects.toBeInstanceOf(ConflictError);
    expect(calls()).toBe(1);
  });
});
