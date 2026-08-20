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
