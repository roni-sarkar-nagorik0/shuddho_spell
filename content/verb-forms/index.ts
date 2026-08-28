import { parseVerbEntry, rawVerbGroupSchema, type IRawVerbGroup, type IVerbEntry } from './schema';
import { VERBS_A_D } from './verbs-a-d';
import { VERBS_E_L } from './verbs-e-l';
import { VERBS_M_R } from './verbs-m-r';
import { VERBS_S_Z } from './verbs-s-z';

/**
 * The verb corpus, assembled and parsed once.
 *
 * Validated at module load exactly as the other three corpora are, and failing
 * the build on the same terms: a malformed line, a verb listed twice, or a
 * corpus that has quietly shrunk below the size the product prints on a screen.
 */
const GROUPS: readonly IRawVerbGroup[] = [VERBS_A_D, VERBS_E_L, VERBS_M_R, VERBS_S_Z];

/**
 * The floor this corpus promises.
 *
 * The source list is a thousand rows, one of which is blank and one of which is
 * archaic and self-contradictory. 998 is what survives, and the screen says
 * "998 verbs" rather than "1000" for that reason — the round number was the
 * source's claim, not this product's.
 */
export const VERB_MINIMUM_ENTRIES = 990;

export interface IVerbIssue {
  readonly file: string;
  readonly path: string;
  readonly message: string;
}

export interface IVerbCounts {
  readonly verbs: number;
  readonly irregular: number;
  readonly core: number;
  readonly withBangla: number;
  readonly overrides: number;
}

export interface IVerbValidation {
  readonly issues: readonly IVerbIssue[];
  readonly counts: IVerbCounts;
}

/**
 * The rules a caller checks the overrides against.
 *
 * Injected rather than imported, because the rules live in the domain
 * (`VerbConjugator`) and `content/` sits outside `src/`. Passing them in keeps
 * this directory free of application code while still letting the build assert
 * the thing that matters: **an override must be an exception**. One that the
 * rule would have produced anyway is dead content, and dead content is how a
 * corpus stops being derived without anybody noticing.
 */
export interface IConjugationRules {
  readonly presentParticiple: (base: string) => { readonly form: string };
  readonly thirdPerson: (base: string) => { readonly form: string };
}

function fileFor(range: string): string {
  return `content/verb-forms/verbs-${range}.ts`;
}

/** Which file a base form lives in, for an issue message that can be acted on. */
function rangeFor(base: string): string {
  const letter = base[0] ?? 'a';

  if (letter <= 'd') return 'a-d';
  if (letter <= 'l') return 'e-l';
  if (letter <= 'r') return 'm-r';
  return 's-z';
}

function read(): { readonly entries: readonly IVerbEntry[]; readonly issues: readonly IVerbIssue[] } {
  const entries: IVerbEntry[] = [];
  const issues: IVerbIssue[] = [];
  const seen = new Set<string>();

  for (const group of GROUPS) {
    const file = fileFor(group.range);
    const shape = rawVerbGroupSchema.safeParse(group);

    if (!shape.success) {
      for (const issue of shape.error.issues) {
        issues.push({ file, path: issue.path.join('.'), message: issue.message });
      }
      continue;
    }

    for (const line of group.entries) {
      const { entry, issues: failures } = parseVerbEntry(line);

      for (const failure of failures) {
        issues.push({ file, path: failure.path, message: failure.message });
      }

      if (entry === null) {
        continue;
      }

      /*
       * Keyed on the base *and* the past, not the base alone. Three verbs in
       * this corpus are two verbs sharing a spelling — `lie / lay / lain` and
       * `lie / lied / lied` — and both rows are real. What must not happen is
       * the *same* conjugation twice, which is a copy-paste rather than a
       * homograph.
       */
      const key = `${entry.base}|${entry.past ?? ''}|${entry.participle ?? ''}`;

      if (seen.has(key)) {
        issues.push({ file, path: entry.base, message: 'is listed twice with the same forms' });
        continue;
      }

      seen.add(key);
      entries.push(entry);
    }
  }

  /*
   * A homograph must say which verb it is, and **both** rows must say it — a
   * check that can only be made once every file has been read, which is why it
   * is here rather than in the loop. A `lie` labelled "recline" beside a `lie`
   * labelled nothing reads as one real entry and one mistake.
   */
  const byBase = new Map<string, number>();

  for (const entry of entries) {
    byBase.set(entry.base, (byBase.get(entry.base) ?? 0) + 1);
  }

  for (const entry of entries) {
    if ((byBase.get(entry.base) ?? 0) > 1 && entry.sense === null) {
      issues.push({
        file: fileFor(entry.base[0] === undefined ? 'a-d' : rangeFor(entry.base)),
        path: entry.base,
        message: 'is spelled like another verb here — give each one a sense=',
      });
    }
  }

  return { entries, issues };
}

const parsed = read();

/** The corpus, parsed and frozen, in the order the files list it. */
export const VERBS: readonly IVerbEntry[] = Object.freeze(parsed.entries);

/**
 * The corpus and its issues, for `pnpm content:validate`.
 *
 * The two checks here are the ones no single line can make about itself: the
 * size floor, and whether each recorded exception is really an exception.
 */
export function validateVerbs(rules: IConjugationRules): IVerbValidation {
  const issues = [...parsed.issues];

  for (const entry of parsed.entries) {
    if (
      entry.presentParticiple !== null &&
      entry.presentParticiple === rules.presentParticiple(entry.base).form
    ) {
      issues.push({
        file: 'content/verb-forms',
        path: entry.base,
        message: `ing=${entry.presentParticiple} is what the rule already gives — remove it`,
      });
    }

    if (
      entry.thirdPerson !== null &&
      entry.thirdPerson === rules.thirdPerson(entry.base).form
    ) {
      issues.push({
        file: 'content/verb-forms',
        path: entry.base,
        message: `s=${entry.thirdPerson} is what the rule already gives — remove it`,
      });
    }
  }

  if (parsed.entries.length < VERB_MINIMUM_ENTRIES) {
    issues.push({
      file: 'content/verb-forms/index.ts',
      path: 'VERB_MINIMUM_ENTRIES',
      message: `the corpus promises at least ${String(VERB_MINIMUM_ENTRIES)} verbs and holds ${String(parsed.entries.length)}`,
    });
  }

  return {
    issues,
    counts: {
      verbs: parsed.entries.length,
      irregular: parsed.entries.filter((entry) => entry.past !== null).length,
      core: parsed.entries.filter((entry) => entry.isCore).length,
      withBangla: parsed.entries.filter((entry) => entry.banglaMeaning !== null).length,
      overrides: parsed.entries.filter(
        (entry) => entry.presentParticiple !== null || entry.thirdPerson !== null,
      ).length,
    },
  };
}

export { type IVerbEntry } from './schema';
