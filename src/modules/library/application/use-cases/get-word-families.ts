import { type WordFamily } from '../../domain/entities/word-family';
import { type ICourseWordIndex } from '../../domain/repositories/course-word-index';
import { type IRuleFamilyRepository } from '../../domain/repositories/rule-family-repository';
import { type IWordFamilySource } from '../../domain/repositories/word-family-source';
import { type IeltsSkill } from '../../domain/value-objects/ielts-skill';
import {
  type IRuleTally,
  type ITopicTally,
  type IWordFamilyPage,
  type IWordFamilyView,
} from '../dto/word-family-view';

export interface IGetWordFamiliesInput {
  readonly skill?: IeltsSkill;
  readonly topic?: string;
  readonly ruleFamily?: string;
  /** The beginning of a word the learner is looking for. */
  readonly startsWith?: string;
  /** The root of the last family on the previous page. */
  readonly after?: string;
  readonly pageSize: number;
}

/** A ceiling on what one request may ask for, whatever the query string says. */
const MAX_PAGE_SIZE = 60;

/**
 * A page of the IELTS word families.
 *
 * **The tallies are over the filtered set, and the totals are not.** Both
 * numbers are on the screen at once and they answer different questions: "how
 * much of English is in here" and "how much of it matches what I asked for". A
 * screen showing only the second reads as a much smaller product than it is;
 * one showing only the first cannot tell a learner that their filter found
 * nothing.
 *
 * **The topic index is always over the whole corpus.** It is navigation — a
 * list of doors — and a door that vanishes because the current filter excluded
 * it is a door the learner cannot find their way back through. This is the same
 * reasoning that keeps a disabled control on screen rather than removing it.
 *
 * One query, and only for the rule statements. The families themselves are a
 * compiled module.
 */
export class GetWordFamiliesUseCase {
  constructor(
    private readonly families: IWordFamilySource,
    private readonly ruleFamilies: IRuleFamilyRepository,
    private readonly courseWords: ICourseWordIndex,
  ) {}

  async execute(input: IGetWordFamiliesInput): Promise<IWordFamilyPage> {
    const all = this.families.listAll();
    const rules = await this.ruleFamilies.listAll();
    const statements = new Map(rules.map((rule) => [rule.code, rule.statement] as const));

    const matched = all.filter((family) => this.keeps(family, input));

    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize));
    const start =
      input.after === undefined
        ? 0
        : matched.findIndex((family) => family.root === input.after) + 1;
    const page = matched.slice(start, start + pageSize);

    return {
      families: page.map((family) => this.view(family, statements)),
      nextCursor:
        start + pageSize < matched.length ? (page[page.length - 1]?.root ?? null) : null,
      matchedFamilies: matched.length,
      matchedWords: countWords(matched),
      totalFamilies: all.length,
      totalWords: countWords(all),
      topics: tally(all),
      rules: rulesIn(all, statements),
    };
  }

  private keeps(family: WordFamily, input: IGetWordFamiliesInput): boolean {
    if (input.skill !== undefined && !family.teaches(input.skill)) {
      return false;
    }

    if (input.topic !== undefined && family.topic !== input.topic) {
      return false;
    }

    if (input.ruleFamily !== undefined && family.ruleFamily !== input.ruleFamily) {
      return false;
    }

    return input.startsWith === undefined || family.matches(input.startsWith);
  }

  private view(family: WordFamily, statements: ReadonlyMap<string, string>): IWordFamilyView {
    const members = family.members.map((member) => ({
      text: member.text,
      partOfSpeech: member.partOfSpeech,
      change: {
        kind: member.change.kind,
        prefix: member.change.prefix,
        suffix: member.change.suffix,
        reversesMeaning: member.change.reversesMeaning,
      },
      inCourse: this.courseWords.has(member.text),
    }));

    return {
      root: family.root,
      banglaMeaning: family.banglaMeaning,
      topic: family.topic,
      skills: family.skills,
      ruleFamilyCode: family.ruleFamily,
      /**
       * `?? null`, not `?? family.ruleFamily`. A code with no statement behind
       * it is a content bug, and printing the raw code — `y_to_i` — would dress
       * the bug up as a heading a learner is meant to read.
       */
      ruleStatement:
        family.ruleFamily === null ? null : (statements.get(family.ruleFamily) ?? null),
      members,
      inCourseCount:
        members.filter((member) => member.inCourse).length +
        (this.courseWords.has(family.root) ? 1 : 0),
    };
  }
}

/**
 * Distinct words across a set of families.
 *
 * A set rather than a sum of sizes. The corpus guarantees a word belongs to one
 * family and the build fails otherwise — but this number is printed on the
 * screen as the size of the product, and a claim that big should be counted
 * rather than inferred from a guarantee made somewhere else.
 */
function countWords(families: readonly WordFamily[]): number {
  const seen = new Set<string>();

  for (const family of families) {
    for (const word of family.words) {
      seen.add(word);
    }
  }

  return seen.size;
}

function tally(families: readonly WordFamily[]): readonly ITopicTally[] {
  const byTopic = new Map<string, WordFamily[]>();

  for (const family of families) {
    const group = byTopic.get(family.topic);

    if (group === undefined) {
      byTopic.set(family.topic, [family]);
    } else {
      group.push(family);
    }
  }

  return Array.from(byTopic, ([topic, group]) => ({
    topic,
    families: group.length,
    words: countWords(group),
  })).sort((a, b) => b.words - a.words);
}

/**
 * The rules this corpus demonstrates, commonest first.
 *
 * A rule with no statement behind it is left out rather than listed with its
 * code showing, for the same reason `ruleStatement` is null in that case: a
 * filter labelled `y_to_i` is a bug wearing a heading.
 */
function rulesIn(
  families: readonly WordFamily[],
  statements: ReadonlyMap<string, string>,
): readonly IRuleTally[] {
  const byRule = new Map<string, WordFamily[]>();

  for (const family of families) {
    if (family.ruleFamily === null) {
      continue;
    }

    const group = byRule.get(family.ruleFamily);

    if (group === undefined) {
      byRule.set(family.ruleFamily, [family]);
    } else {
      group.push(family);
    }
  }

  return Array.from(byRule)
    .flatMap(([code, group]) => {
      const statement = statements.get(code);

      return statement === undefined
        ? []
        : [{ code, statement, families: group.length, words: countWords(group) }];
    })
    .sort((a, b) => b.families - a.families);
}
