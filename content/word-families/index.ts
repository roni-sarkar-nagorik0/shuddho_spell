import { RULE_FAMILIES } from '../rule-families';
import { FAMILIES_ENVIRONMENT } from './families-environment';
import { FAMILIES_HEALTH } from './families-health';
import { FAMILIES_LEARNING } from './families-learning';
import { FAMILIES_MODERN } from './families-modern';
import { FAMILIES_SOCIETY } from './families-society';
import { FAMILIES_WORK } from './families-work';
import {
  parseWordFamily,
  rawWordFamilySchema,
  type IWordFamily,
  type RawWordFamily,
} from './schema';

/**
 * The IELTS word-family corpus, assembled and parsed once.
 *
 * The raw entries are validated at module load, exactly as the 28-day corpus
 * is: `pnpm content:validate` runs in `prebuild`, so a family that names a rule
 * that does not exist, or repeats a word another family already owns, fails the
 * build rather than rendering as a slightly wrong screen.
 */
const RAW: readonly RawWordFamily[] = [
  ...FAMILIES_LEARNING,
  ...FAMILIES_ENVIRONMENT,
  ...FAMILIES_WORK,
  ...FAMILIES_SOCIETY,
  ...FAMILIES_HEALTH,
  ...FAMILIES_MODERN,
];

/**
 * The floor this corpus promises.
 *
 * Asserted rather than described, because "1,800 IELTS words" is a claim the
 * product makes on a screen a learner reads. A corpus that quietly fell to
 * 1,600 after a de-duplication would leave the claim standing and untrue, and
 * nothing else in the build would notice.
 */
export const WORD_FAMILY_MINIMUM_WORDS = 1800;

export interface IWordFamilyIssue {
  readonly file: string;
  readonly path: string;
  readonly message: string;
}

export interface IWordFamilyCounts {
  readonly families: number;
  readonly words: number;
  readonly topics: number;
  readonly withRule: number;
}

export interface IWordFamilyValidation {
  readonly issues: readonly IWordFamilyIssue[];
  readonly counts: IWordFamilyCounts;
}

function fileFor(root: string): string {
  const sources: readonly (readonly [readonly RawWordFamily[], string])[] = [
    [FAMILIES_LEARNING, 'families-learning'],
    [FAMILIES_ENVIRONMENT, 'families-environment'],
    [FAMILIES_WORK, 'families-work'],
    [FAMILIES_SOCIETY, 'families-society'],
    [FAMILIES_HEALTH, 'families-health'],
    [FAMILIES_MODERN, 'families-modern'],
  ];

  const found = sources.find(([entries]) => entries.some((entry) => entry.root === root));

  return `content/word-families/${found?.[1] ?? 'unknown'}.ts`;
}

/**
 * The checks a single family cannot make about itself.
 *
 * Two of them matter more than the rest:
 *
 * **A word may belong to exactly one family.** The screen is a map of English,
 * and a map where `development` appears under both `develop` and `develop-city`
 * is telling the learner that one word has two origins. Worse, it double-counts
 * towards the 1,800.
 *
 * **A named rule must exist.** `rule` is a free string in the schema so that the
 * 24 codes are not copied into a second file — this is where the copy is
 * avoided *and* the reference still checked. A family citing `y_to_ie` would
 * otherwise render a heading with nothing under it.
 */
export function validateWordFamilies(
  raw: readonly RawWordFamily[] = RAW,
): IWordFamilyValidation {
  const issues: IWordFamilyIssue[] = [];
  const families: IWordFamily[] = [];
  const ruleCodes = new Set(RULE_FAMILIES.map((family) => family.code));
  /** Every word seen so far, and the root of the family that claimed it. */
  const owner = new Map<string, string>();

  for (const entry of raw) {
    const root = typeof entry.root === 'string' ? entry.root : '(unnamed)';
    const file = fileFor(root);
    const shape = rawWordFamilySchema.safeParse(entry);

    if (!shape.success) {
      for (const issue of shape.error.issues) {
        issues.push({ file, path: `${root} · ${issue.path.join('.')}`, message: issue.message });
      }
      continue;
    }

    if (shape.data.rule !== null && !ruleCodes.has(shape.data.rule)) {
      issues.push({
        file,
        path: `${root} · rule`,
        message: `"${shape.data.rule}" is not one of the ${String(ruleCodes.size)} rule families`,
      });
    }

    const { family, issues: parseIssues } = parseWordFamily(shape.data);

    for (const issue of parseIssues) {
      issues.push({ file, path: `${root} · ${issue.path}`, message: issue.message });
    }

    if (family === null) {
      continue;
    }

    for (const word of [family.root, ...family.members.map((member) => member.text)]) {
      const claimed = owner.get(word);

      if (claimed !== undefined) {
        issues.push({
          file,
          path: `${root} · forms`,
          message: `"${word}" already belongs to the "${claimed}" family`,
        });
        continue;
      }

      owner.set(word, family.root);
    }

    families.push(family);
  }

  if (owner.size < WORD_FAMILY_MINIMUM_WORDS) {
    issues.push({
      file: 'content/word-families/index.ts',
      path: 'corpus',
      message: `the corpus holds ${String(owner.size)} words; the product claims at least ${String(WORD_FAMILY_MINIMUM_WORDS)}`,
    });
  }

  return {
    issues,
    counts: {
      families: families.length,
      words: owner.size,
      topics: new Set(families.map((family) => family.topic)).size,
      withRule: families.filter((family) => family.ruleFamily !== null).length,
    },
  };
}

/**
 * The parsed corpus.
 *
 * Built from the same pass that validates, so there is no second traversal and
 * no possibility of the exported families differing from the validated ones. A
 * family with an issue is **left out** rather than exported half-formed: the
 * build fails on the issue anyway, and in a test that tolerates it the screen
 * shows less rather than shows something wrong.
 */
export const WORD_FAMILIES: readonly IWordFamily[] = (() => {
  const parsed: IWordFamily[] = [];

  for (const entry of RAW) {
    const shape = rawWordFamilySchema.safeParse(entry);

    if (!shape.success) {
      continue;
    }

    const { family } = parseWordFamily(shape.data);

    if (family !== null) {
      parsed.push(family);
    }
  }

  return parsed;
})();
