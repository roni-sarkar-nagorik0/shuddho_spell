/** One form, and the rule that produced it. */
export interface IVerbFormView {
  readonly form: string;
  readonly rule: string;
}

/** One verb, in all five forms, ready to render. */
export interface IVerbView {
  readonly base: string;
  readonly past: IVerbFormView;
  readonly participle: IVerbFormView;
  readonly presentParticiple: IVerbFormView;
  readonly thirdPerson: IVerbFormView;
  readonly isIrregular: boolean;
  readonly isCore: boolean;
  /**
   * How many of base, past and participle are different words.
   *
   * 1 for `cut / cut / cut`, 2 for `buy / bought / bought`, 3 for
   * `write / wrote / written`. The screen groups by this because it is the only
   * honest measure of how much there is to learn about an irregular verb.
   */
  readonly distinctForms: number;
  readonly banglaMeaning: string | null;
  /** Which verb this is where a spelling is two verbs — `lie`, `bear`, `bid`. */
  readonly sense: string | null;
  /** Whether the base form is one of the 3,000 the course teaches. */
  readonly inCourse: boolean;
}

export interface IVerbTally {
  readonly label: string;
  readonly verbs: number;
}

export interface IVerbPage {
  readonly verbs: readonly IVerbView[];
  /** The base form to pass as `after` for the next page, or null at the end. */
  readonly nextCursor: string | null;
  /** How many verbs the filters matched, before paging. */
  readonly matchedVerbs: number;
  /** The whole corpus, unfiltered — the number the screen promises. */
  readonly totalVerbs: number;
  readonly irregularVerbs: number;
  readonly coreVerbs: number;
  /** How many carry a checked Bangla gloss. Printed, because it is not all. */
  readonly withBangla: number;
  /** The letter index down the side: a–d, e–l, m–r, s–z. */
  readonly letters: readonly IVerbTally[];
}
