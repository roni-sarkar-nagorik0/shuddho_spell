import { type IIdGenerator } from '../../application/ports/id-generator';

/**
 * `crypto.randomUUID` — v4, in Node and the Edge runtime alike, no dependency.
 *
 * Ids are made here rather than by `gen_random_uuid()` so a use case can build
 * an object graph that references itself before any of it is written: a lesson
 * session and its first attempt are saved together, and the attempt needs the
 * session's id while both are still in memory.
 */
export class UuidGenerator implements IIdGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}
