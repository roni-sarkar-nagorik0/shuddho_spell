/**
 * What one word did to another to become itself.
 *
 * This is the whole teaching claim of the word-family screen. Showing a learner
 * `happy · happier · happiest · happily · happiness` is a list; showing them
 * that four of those five replaced the **y with an i** is a rule they can carry
 * to `carry`, `beauty` and `busy`. The difference between the two screens is
 * this file.
 *
 * **Derived, never stored.** The corpus records only the words. The relation
 * between a root and a form is a fact about the two strings, so computing it
 * removes the one thing 2,299 hand-written labels would certainly contain: a
 * label that disagrees with the word it sits under.
 */

export type ChangeKind =
  /** The root is unchanged and something was added: `work + er`. */
  | 'suffix'
  /** The final consonant doubled first: `stop + p + ing`. */
  | 'doubled'
  /** The final y became an i: `happy → happi + ness`. */
  | 'y-to-i'
  /** The silent e was dropped: `educate → educat + ion`. */
  | 'drop-e'
  /** Nothing regular connects them: `speak → spoke`. */
  | 'irregular';

export interface IFormChange {
  readonly kind: ChangeKind;
  /** The prefix, without a hyphen, or null when there is none. */
  readonly prefix: string | null;
  /** The suffix, without a hyphen, or null when the change is a prefix alone. */
  readonly suffix: string | null;
  /** Whether the prefix reverses the root's meaning, as `un-` does. */
  readonly reversesMeaning: boolean;
}

/**
 * The prefixes worth naming, longest first.
 *
 * Longest first is load-bearing: `in` is a prefix of `inter`, and testing `in`
 * against `international` would report the prefix as `in-` and the remainder as
 * `ternational`, which relates to no root at all. Sorting by length makes the
 * first match the right one.
 *
 * This is not every English prefix. It is the ones that appear in this corpus,
 * because a prefix listed here and never used costs a comparison on every call,
 * and a prefix used and not listed degrades to `irregular` — which is honest.
 */
const PREFIXES: readonly string[] = [
  'under',
  'inter',
  'multi',
  'super',
  'extra',
  'anti',
  'over',
  'post',
  'self',
  'dis',
  'mis',
  'non',
  'pre',
  'sub',
  'un',
  'in',
  'im',
  'ir',
  'il',
  're',
  'de',
  'co',
  'ex',
];

/**
 * The prefixes that flip the meaning rather than shading it.
 *
 * A learner reading `unemployment` under `employ` needs to be told that this
 * one means the *opposite*, not more of the same. `re-` and `over-` shade;
 * `un-` and `dis-` reverse. Getting this wrong on screen would teach a
 * confident falsehood, which is why it is a list rather than a guess.
 */
const REVERSING: ReadonlySet<string> = new Set(['un', 'in', 'im', 'ir', 'il', 'dis', 'non', 'mis']);

interface ISuffixChange {
  readonly kind: ChangeKind;
  readonly suffix: string | null;
}

/**
 * How `form` was built from `root` without any prefix in play.
 *
 * The order of the tests is the whole correctness of this function. Doubling is
 * checked **before** the plain suffix, because `stopping` starts with `stop`
 * and a plain-suffix reading would report the suffix as `ping` — a suffix
 * English does not have, printed under a heading that claims to name the rule.
 */
function suffixChange(root: string, form: string): ISuffixChange {
  if (form === root) {
    return { kind: 'suffix', suffix: null };
  }

  const last = root.slice(-1);

  if (root.length >= 2 && form.startsWith(`${root}${last}`)) {
    return { kind: 'doubled', suffix: form.slice(root.length + 1) };
  }

  if (form.startsWith(root)) {
    return { kind: 'suffix', suffix: form.slice(root.length) };
  }

  if (last === 'y') {
    const stem = `${root.slice(0, -1)}i`;

    if (form.startsWith(stem)) {
      return { kind: 'y-to-i', suffix: form.slice(stem.length) };
    }
  }

  if (last === 'e') {
    const stem = root.slice(0, -1);

    if (form.startsWith(stem)) {
      return { kind: 'drop-e', suffix: form.slice(stem.length) };
    }
  }

  return { kind: 'irregular', suffix: null };
}

/**
 * Names the change from `root` to `form`.
 *
 * A prefix is stripped first and the remainder tested against the root, so
 * `unhappiness` is reported as `un-` plus a y-to-i, rather than as irregular —
 * which is what a single pass would call it, and which would hide the rule on
 * exactly the words where it is hardest to see.
 *
 * A prefix is only accepted when what is left **relates to the root**. Without
 * that condition `interpret` would be read as `inter-` plus `pret`, and every
 * word beginning with two familiar letters would grow a spurious prefix.
 */
export function changeBetween(root: string, form: string): IFormChange {
  const direct = suffixChange(root, form);

  if (direct.kind !== 'irregular') {
    return {
      kind: direct.kind,
      prefix: null,
      suffix: direct.suffix,
      reversesMeaning: false,
    };
  }

  for (const prefix of PREFIXES) {
    if (!form.startsWith(prefix) || form.length <= prefix.length) {
      continue;
    }

    const remainder = form.slice(prefix.length);
    const change = suffixChange(root, remainder);

    if (change.kind === 'irregular') {
      continue;
    }

    return {
      kind: change.kind,
      prefix,
      suffix: change.suffix,
      reversesMeaning: REVERSING.has(prefix),
    };
  }

  return { kind: 'irregular', prefix: null, suffix: null, reversesMeaning: false };
}
