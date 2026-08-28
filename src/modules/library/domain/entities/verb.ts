import {
  presentParticiple,
  regularPast,
  thirdPerson,
  type VerbRule,
} from '../services/verb-conjugator';

export interface IVerbForm {
  readonly form: string;
  /**
   * How this form was reached from the base.
   *
   * `irregular` means it was written down because no rule reaches it. Every
   * other value names a rule a learner can apply to the next verb they meet,
   * which is the only reason this field exists — a screen that prints five
   * forms teaches five words, and one that prints the rule teaches the
   * thousand.
   */
  readonly rule: VerbRule;
}

/**
 * One verb, in all five forms.
 *
 * The entity's job is the **derivation**. The corpus hands over a base form and
 * — only where English is irregular — a past and a participle; this is where
 * the other forms are worked out and where each one is asked which rule
 * produced it. Doing it here rather than in a use case means the answer is the
 * same whether the verb is rendered in a table, asked in a drill, or asserted
 * in a test.
 *
 * There is no learner state on a verb. A conjugation is a fact about English,
 * not about a person — `review_items` is keyed on the 3,000 programme words,
 * and attaching an accuracy figure to 998 verbs nobody has been asked would put
 * an invented number on the screen.
 */
export class Verb {
  private constructor(
    readonly base: string,
    readonly past: IVerbForm,
    readonly participle: IVerbForm,
    readonly presentParticiple: IVerbForm,
    readonly thirdPerson: IVerbForm,
    readonly isCore: boolean,
    readonly banglaMeaning: string | null,
    readonly sense: string | null,
  ) {}

  static create(input: {
    readonly base: string;
    readonly past: string | null;
    readonly participle: string | null;
    readonly presentParticiple: string | null;
    readonly thirdPerson: string | null;
    readonly isCore: boolean;
    readonly banglaMeaning: string | null;
    readonly sense: string | null;
  }): Verb {
    const regular = regularPast(input.base);

    return new Verb(
      input.base,
      input.past === null ? regular : { form: input.past, rule: 'irregular' },
      input.participle === null ? regular : { form: input.participle, rule: 'irregular' },
      /*
       * An override is `irregular` even for the -ing and -s forms, because from
       * the learner's side that is exactly what it is: `travelling` cannot be
       * got to from `travel` by any rule this product is willing to state, so
       * it has to be remembered. Calling it `double` would be claiming a rule
       * the screen would then teach wrongly to `visit`.
       */
      input.presentParticiple === null
        ? presentParticiple(input.base)
        : { form: input.presentParticiple, rule: 'irregular' },
      input.thirdPerson === null
        ? thirdPerson(input.base)
        : { form: input.thirdPerson, rule: 'irregular' },
      input.isCore,
      input.banglaMeaning,
      input.sense,
    );
  }

  /** V2 and V3 differ from the regular `-ed`, so both must be learnt. */
  get isIrregular(): boolean {
    return this.past.rule === 'irregular' || this.participle.rule === 'irregular';
  }

  /**
   * The hardest kind of irregular: past and participle differ from each other
   * as well as from the base — `write / wrote / written`.
   *
   * Worth naming because the other two shapes are much easier and a learner who
   * knows which shape they are looking at has already done half the work:
   * `cut / cut / cut` is one word, `buy / bought / bought` is two.
   */
  get distinctForms(): number {
    return new Set([this.base, this.past.form, this.participle.form]).size;
  }

  /** All five, in the order the tables of the world print them. */
  get forms(): readonly string[] {
    return [
      this.base,
      this.past.form,
      this.participle.form,
      this.presentParticiple.form,
      this.thirdPerson.form,
    ];
  }

  /**
   * Whether any of the five forms begins with `prefix`.
   *
   * All five, not just the base: a learner who has met `bought` and wants to
   * know what it belongs to types `bought`, and a search that only looked at
   * base forms would answer with nothing — which is the exact moment the
   * reference was most needed.
   */
  matches(prefix: string): boolean {
    const needle = prefix.trim().toLowerCase();

    return needle === '' || this.forms.some((form) => form.startsWith(needle));
  }
}
