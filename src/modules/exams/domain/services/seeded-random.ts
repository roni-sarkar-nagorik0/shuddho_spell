/**
 * A deterministic pseudo-random number from a seed and a key.
 *
 * `Math.random()` is banned throughout the domain and this is why there is
 * something to ban it in favour of: `08-exam-engine.md` requires an attempt to
 * be **reproducible from the seed stored on it**, so that support can rebuild
 * the exact paper a learner sat and a test can assert the same seed twice
 * produces the same questions. A global generator cannot promise that — its
 * state depends on how many other things called it first.
 *
 * Keyed rather than sequential for the same reason. `next(seed, itemId)` is a
 * pure function of its two arguments, so the number a candidate gets does not
 * depend on where it happened to sit in the list, and adding a word to the
 * course does not reshuffle every attempt ever taken.
 *
 * The mixer is xmur3 and the generator mulberry32 — both small, both public
 * domain, both chosen for being deterministic and evenly distributed rather
 * than for being cryptographic. Nothing here is a secret; the seed is stored in
 * a column, on purpose, so an attempt can be rebuilt.
 */
const MURMUR_MULTIPLIER = 3432918353;
const MURMUR_ROTATE = 461845907;
const MULBERRY_INCREMENT = 0x6d2b79f5;
const TWO_POW_32 = 4294967296;

function mix(value: string): number {
  let hash = 1779033703 ^ value.length;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), MURMUR_MULTIPLIER);
    hash = (hash << 13) | (hash >>> 19);
  }

  hash = Math.imul(hash ^ (hash >>> 16), MURMUR_ROTATE);

  return (hash ^ (hash >>> 16)) >>> 0;
}

/** 0 ≤ result < 1, and the same every time for the same two arguments. */
export function seededUnitValue(seed: string, key: string): number {
  let state = (mix(seed) ^ mix(key)) >>> 0;

  state = (state + MULBERRY_INCREMENT) >>> 0;

  let result = Math.imul(state ^ (state >>> 15), 1 | state);
  result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;

  return ((result ^ (result >>> 14)) >>> 0) / TWO_POW_32;
}
