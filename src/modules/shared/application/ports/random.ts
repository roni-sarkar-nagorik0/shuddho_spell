export const RANDOM_SOURCE = Symbol('RANDOM_SOURCE');

/**
 * The only source of chance in the application layer.
 *
 * The same argument as `IClock`, for the same reason: a use case that calls
 * `Math.random()` cannot be tested. "Picks a word from the pool" becomes an
 * assertion you can only make about a set, never about a result, and the
 * interesting cases — the first element, the last element, an empty pool — are
 * reachable only by looping and hoping.
 *
 * One method, and it takes a size rather than returning a fraction. A port that
 * handed back `0.7431` would leave every caller to do the same multiply-and-
 * floor, and the off-by-one in that arithmetic is exactly the bug this hides.
 */
export interface IRandomSource {
  /**
   * A whole number in `[0, size)`. Returns 0 for a size of 0 or less, so a
   * caller indexing an empty array gets `undefined` rather than a negative
   * index or a thrown error at the wrong layer.
   */
  readonly below: (size: number) => number;
}
