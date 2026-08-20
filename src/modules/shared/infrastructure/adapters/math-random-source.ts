import { type IRandomSource } from '../../application/ports/random';

/**
 * `Math.random()`, floored — and that is deliberate rather than lazy.
 *
 * There is one caller: choosing which word the marketing page's demo shows.
 * Nothing here decides an exam paper, a review order or anything a learner is
 * scored on, so a cryptographic source would be answering a question nobody
 * asked. If something ever does need unpredictability rather than variety, it
 * gets its own adapter — `crypto.getRandomValues` behind this same port —
 * rather than this one being quietly upgraded and both callers inheriting a
 * cost only one of them needs.
 */
export class MathRandomSource implements IRandomSource {
  below(size: number): number {
    return size <= 0 ? 0 : Math.floor(Math.random() * size);
  }
}
