import { type Verb } from '../../domain/entities/verb';
import { type ICourseWordIndex } from '../../domain/repositories/course-word-index';
import { type IVerbSource } from '../../domain/repositories/verb-source';
import { type IVerbPage, type IVerbTally, type IVerbView } from '../dto/verb-view';

export interface IGetVerbsInput {
  /** `a-d`, `e-l`, `m-r`, `s-z` — the letter block. */
  readonly letters?: string;
  /** `irregular`, `regular`, or `core` for the hundred to learn first. */
  readonly group?: string;
  /** The beginning of any of the five forms. */
  readonly startsWith?: string;
  /** The base form of the last verb on the previous page. */
  readonly after?: string;
  readonly pageSize: number;
}

/** A ceiling on what one request may ask for, whatever the query string says. */
const MAX_PAGE_SIZE = 100;

const LETTER_BLOCKS: readonly (readonly [string, string, string])[] = [
  ['a-d', 'a', 'd'],
  ['e-l', 'e', 'l'],
  ['m-r', 'm', 'r'],
  ['s-z', 's', 'z'],
];

/**
 * A page of the verb reference.
 *
 * **The counts are over the whole corpus and the match count is not**, which is
 * the same split `GetVocabulary` and `GetWordFamilies` make: "how much is in
 * here" and "how much matches what I asked for" are two questions a learner
 * asks at once, and a screen answering only the second reads as a much smaller
 * product than it is.
 *
 * **The order is alphabetical**, unlike the vocabulary reference — and for a
 * reason rather than by accident. A synonym list has an editorial order worth
 * keeping; a verb list is looked up. Somebody arriving here has a verb in mind,
 * and alphabetical is the order that lets them find it without the search box.
 *
 * No query: the corpus is a compiled module and the course index is a set built
 * at construction, so this use case never leaves the process.
 */
export class GetVerbsUseCase {
  constructor(
    private readonly verbs: IVerbSource,
    private readonly courseWords: ICourseWordIndex,
  ) {}

  async execute(input: IGetVerbsInput): Promise<IVerbPage> {
    const all = this.verbs.listAll();
    const matched = all.filter((verb) => keeps(verb, input));

    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize));
    const start =
      input.after === undefined ? 0 : matched.findIndex((verb) => verb.base === input.after) + 1;
    const page = matched.slice(start, start + pageSize);

    return Promise.resolve({
      verbs: page.map((verb) => this.view(verb)),
      nextCursor: start + pageSize < matched.length ? (page[page.length - 1]?.base ?? null) : null,
      matchedVerbs: matched.length,
      totalVerbs: all.length,
      irregularVerbs: all.filter((verb) => verb.isIrregular).length,
      coreVerbs: all.filter((verb) => verb.isCore).length,
      withBangla: all.filter((verb) => verb.banglaMeaning !== null).length,
      letters: letterTally(all),
    });
  }

  private view(verb: Verb): IVerbView {
    return {
      base: verb.base,
      past: { form: verb.past.form, rule: verb.past.rule },
      participle: { form: verb.participle.form, rule: verb.participle.rule },
      presentParticiple: {
        form: verb.presentParticiple.form,
        rule: verb.presentParticiple.rule,
      },
      thirdPerson: { form: verb.thirdPerson.form, rule: verb.thirdPerson.rule },
      isIrregular: verb.isIrregular,
      isCore: verb.isCore,
      distinctForms: verb.distinctForms,
      banglaMeaning: verb.banglaMeaning,
      sense: verb.sense,
      inCourse: this.courseWords.has(verb.base),
    };
  }
}

function keeps(verb: Verb, input: IGetVerbsInput): boolean {
  if (input.letters !== undefined) {
    const block = LETTER_BLOCKS.find(([name]) => name === input.letters);
    const first = verb.base[0] ?? 'a';

    if (block === undefined || first < block[1] || first > block[2]) {
      return false;
    }
  }

  if (input.group === 'irregular' && !verb.isIrregular) {
    return false;
  }

  if (input.group === 'regular' && verb.isIrregular) {
    return false;
  }

  if (input.group === 'core' && !verb.isCore) {
    return false;
  }

  return input.startsWith === undefined || verb.matches(input.startsWith);
}

/**
 * How many verbs each letter block holds.
 *
 * Always over the whole corpus, never the filtered set — it is navigation, and
 * a door that vanishes because the current filter excluded it is a door the
 * learner cannot find their way back through.
 */
function letterTally(verbs: readonly Verb[]): readonly IVerbTally[] {
  return LETTER_BLOCKS.map(([label, lo, hi]) => ({
    label,
    verbs: verbs.filter((verb) => {
      const first = verb.base[0] ?? 'a';

      return first >= lo && first <= hi;
    }).length,
  }));
}
