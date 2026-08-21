import { changeBetween, type IFormChange } from '../value-objects/form-change';
import { type IeltsSkill } from '../value-objects/ielts-skill';

export interface IWordFamilyMember {
  readonly text: string;
  readonly partOfSpeech: string;
  /** How this word was built from the root. Derived, never stored. */
  readonly change: IFormChange;
}

/**
 * One root and the words English builds from it.
 *
 * The entity's job is the **derivation**: the corpus hands over a root and a
 * list of forms, and this is where each form is asked what it did to the root
 * to become itself. Doing it here rather than in the use case means the answer
 * is the same whether the family is rendered on a page, filtered in a search,
 * or asserted in a test.
 *
 * There is no learner state on a family and no accuracy figure. A family is a
 * fact about English, not about a person — `review_items` is keyed on the 1,240
 * programme words, and pretending a learner has a record on 2,299 words they
 * have never been asked would put an invented number on the screen.
 */
export class WordFamily {
  private constructor(
    readonly root: string,
    readonly banglaMeaning: string,
    readonly ruleFamily: string | null,
    readonly skills: readonly IeltsSkill[],
    readonly topic: string,
    readonly members: readonly IWordFamilyMember[],
  ) {}

  static create(input: {
    readonly root: string;
    readonly banglaMeaning: string;
    readonly ruleFamily: string | null;
    readonly skills: readonly IeltsSkill[];
    readonly topic: string;
    readonly members: readonly { readonly text: string; readonly partOfSpeech: string }[];
  }): WordFamily {
    return new WordFamily(
      input.root,
      input.banglaMeaning,
      input.ruleFamily,
      input.skills,
      input.topic,
      input.members.map((member) => ({
        text: member.text,
        partOfSpeech: member.partOfSpeech,
        change: changeBetween(input.root, member.text),
      })),
    );
  }

  /** The root plus every form — what this family contributes to the word count. */
  get words(): readonly string[] {
    return [this.root, ...this.members.map((member) => member.text)];
  }

  get size(): number {
    return this.members.length + 1;
  }

  teaches(skill: IeltsSkill): boolean {
    return this.skills.includes(skill);
  }

  /**
   * Whether any word in the family starts with `prefix`.
   *
   * `startsWith`, not `includes`: a learner types the beginning of a word they
   * are looking for. Substring matching would answer `art` with `department`
   * and `start`, burying the family they meant under families that merely
   * contain the letters.
   */
  matches(prefix: string): boolean {
    const needle = prefix.trim().toLowerCase();

    return needle === '' || this.words.some((word) => word.startsWith(needle));
  }
}
