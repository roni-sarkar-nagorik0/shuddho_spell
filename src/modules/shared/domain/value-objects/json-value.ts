/**
 * Well-formed JSON of unknown shape — what a `jsonb` column guarantees.
 *
 * The same definition as `src/lib/db/json.ts`, restated in the domain because
 * `domain` may not import `lib` and an exam question's payload and correct
 * answer are both jsonb. Duplication of a six-line structural type is the
 * cheaper of the two prices: the alternative is a boundary exception, and the
 * boundary is what keeps a row interface out of the domain in the first place.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/**
 * Narrows a `JsonValue` to a JSON **object**.
 *
 * A type predicate rather than a cast, and it has to exist because
 * `Array.isArray` does not narrow a `readonly T[]` out of a union — without it
 * the only route to a property is `as`, which the rules permit at a validated
 * boundary and a jsonb payload read inside the domain is not one.
 */
export function isJsonObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
