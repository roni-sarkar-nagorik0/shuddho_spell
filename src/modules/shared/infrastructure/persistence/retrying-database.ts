import { ConflictError } from '../../domain/errors/conflict.error';
import { MissingReferenceError } from '../../domain/errors/missing-reference.error';
import { type IDatabase } from './database';
import { DatabaseError, PG_CODES } from './database-error';

/**
 * How many times a serialization failure is worth retrying. **One.**
 *
 * 40001 means two transactions touched the same rows and Postgres chose one to
 * abort; retrying once resolves the overwhelming majority, because the winner
 * has committed by the time the loser comes back. Retrying more turns a hot row
 * into a queue of clients all retrying at once, which is how a contention
 * problem becomes an outage. If one retry is not enough, the write is contended
 * enough that a human should hear about it.
 */
const SERIALIZATION_RETRIES = 1;

/**
 * Wraps a database so Postgres codes become typed domain errors, and so a
 * serialization failure is retried exactly once.
 *
 * A decorator rather than logic inside the adapter: the adapter's job is to
 * speak Supabase, and mixing "what does 23505 mean" into it would put a policy
 * decision in the one file that should have none.
 */
export class RetryingDatabase implements IDatabase {
  constructor(private readonly inner: IDatabase) {}

  select: IDatabase['select'] = (query) => this.run(`read ${query.table}`, () => this.inner.select(query));

  selectOne: IDatabase['selectOne'] = (query) =>
    this.run(`read ${query.table}`, () => this.inner.selectOne(query));

  count: IDatabase['count'] = (query) => this.run(`count ${query.table}`, () => this.inner.count(query));

  insert: IDatabase['insert'] = (table, values) =>
    this.run(table, () => this.inner.insert(table, values));

  upsert: IDatabase['upsert'] = (table, values, options) =>
    this.run(table, () => this.inner.upsert(table, values, options));

  update: IDatabase['update'] = (table, values, match) =>
    this.run(table, () => this.inner.update(table, values, match));

  rpc: IDatabase['rpc'] = (fn, args) => this.run(fn, () => this.inner.rpc(fn, args));

  private async run<T>(what: string, work: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await work();
      } catch (caught: unknown) {
        if (!(caught instanceof DatabaseError)) {
          throw caught;
        }

        if (caught.is(PG_CODES.SerializationFailure) && attempt < SERIALIZATION_RETRIES) {
          // Straight back in, no backoff. The conflicting transaction has
          // already finished — that is what made this one fail — so there is
          // nothing to wait for, and sleeping only widens the window for a
          // third writer to arrive.
          continue;
        }

        throw this.translate(what, caught);
      }
    }
  }

  /**
   * The three codes `03-database.md` names. Everything else stays a
   * `DatabaseError` and becomes a 500, which is the honest answer for a failure
   * nobody has decided what to do about.
   */
  private translate(what: string, error: DatabaseError): Error {
    if (error.is(PG_CODES.UniqueViolation)) {
      return new ConflictError(what, error.message);
    }

    if (error.is(PG_CODES.ForeignKeyViolation)) {
      return new MissingReferenceError(what, error.message);
    }

    return error;
  }
}
