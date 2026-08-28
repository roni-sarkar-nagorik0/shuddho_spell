/** How one form was built from its root, ready to render. */
export interface IFormChangeView {
  readonly kind: string;
  readonly prefix: string | null;
  readonly suffix: string | null;
  readonly reversesMeaning: boolean;
}

export interface IWordFamilyMemberView {
  readonly text: string;
  readonly partOfSpeech: string;
  readonly change: IFormChangeView;
  /**
   * Whether this exact word is one of the 3,000 the course teaches.
   *
   * The two corpora are separate on purpose, and this flag is the one bridge
   * between them: a learner who meets `achievement` here can be told that
   * `achieve` is a word they will be drilled on, rather than being left to
   * wonder whether the library and the course are the same product.
   */
  readonly inCourse: boolean;
}

export interface IWordFamilyView {
  readonly root: string;
  readonly banglaMeaning: string;
  readonly topic: string;
  readonly skills: readonly string[];
  readonly ruleFamilyCode: string | null;
  /**
   * The rule, spelled out, or null when the family names none.
   *
   * Carried on the family rather than looked up by the client, because the
   * client would have to hold all 24 statements to do it — and then the screen
   * would show whatever that copy said, not what `rule_families` says.
   */
  readonly ruleStatement: string | null;
  readonly members: readonly IWordFamilyMemberView[];
  readonly inCourseCount: number;
}

/** One row of the topic index down the side of the screen. */
export interface ITopicTally {
  readonly topic: string;
  readonly families: number;
  readonly words: number;
}

/** One row of the rule index — a rule, and how many families demonstrate it. */
export interface IRuleTally {
  readonly code: string;
  readonly statement: string;
  readonly families: number;
  readonly words: number;
}

export interface IWordFamilyPage {
  readonly families: readonly IWordFamilyView[];
  /** The root to pass as `after` for the next page, or null at the end. */
  readonly nextCursor: string | null;
  /** How many families the filters matched, before paging. */
  readonly matchedFamilies: number;
  /** How many distinct words those families hold. */
  readonly matchedWords: number;
  /** The whole corpus, unfiltered — the number the screen promises. */
  readonly totalWords: number;
  readonly totalFamilies: number;
  readonly topics: readonly ITopicTally[];
  /**
   * Only the rules this corpus actually demonstrates, not all 24.
   *
   * Four of the 24 are grammar rather than spelling — `fewer_less`,
   * `article_a_an` — and no word family shows them. Offering them as filters
   * that always return nothing would make the screen look broken in exactly the
   * places it is working correctly.
   */
  readonly rules: readonly IRuleTally[];
}
