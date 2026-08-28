import { type IRandomSource } from '@/modules/shared/application/ports/random';
import { type IVerbForm, type Verb } from '../../domain/entities/verb';
import { type IVerbSource } from '../../domain/repositories/verb-source';
import { type IVerbDrill, type IVerbDrillQuestion } from '../dto/verb-drill';

export interface IGetVerbDrillInput {
  readonly count: number;
  /**
   * Draw only from the hundred commonest verbs.
   *
   * The front door does. A visitor's first question is "can I do this", and
   * asking them the past participle of `abash` answers it with "no" for a
   * reason that has nothing to do with them.
   */
  readonly coreOnly?: boolean;
}

const OPTIONS = 4;
const MAX_QUESTIONS = 20;

/** The four forms a question can ask for, and what they are called. */
const TARGETS = [
  { key: 'V2', name: 'past simple', of: (verb: Verb): IVerbForm => verb.past },
  { key: 'V3', name: 'past participle', of: (verb: Verb): IVerbForm => verb.participle },
  { key: 'V4', name: 'the -ing form', of: (verb: Verb): IVerbForm => verb.presentParticiple },
  { key: 'V5', name: 'he / she / it', of: (verb: Verb): IVerbForm => verb.thirdPerson },
] as const;

/**
 * A short multiple-choice drill over the verb forms.
 *
 * **The wrong answers are the verb's own other forms.** Ask for the V3 of
 * `write` and the options are `written`, `wrote`, `writing`, `writes` — which
 * is precisely the confusion the drill is for, because *I have wrote* is the
 * commonest verb mistake in English and it is a confusion between two forms of
 * one verb, not between two verbs. Distractors taken from elsewhere in the
 * corpus would make the question answerable by recognising the stem, which is
 * not the skill.
 *
 * **The regularised trap.** For an irregular verb the pool also holds the form
 * the rules *would* have produced — `writed`, `taked`, `goed`. That is a word
 * this product is putting on screen that does not exist, which needs saying:
 * it is the single most common learner error, it is marked wrong immediately,
 * and the feedback names it as the regular ending English refuses here. A drill
 * that never showed it would be teaching around the mistake instead of at it.
 *
 * **This is a demonstration, not an assessment.** Nothing is stored, nothing
 * marks a review item, and the answer travels with the question — the same
 * arrangement the vocabulary drill makes, for the same reasons.
 */
export class GetVerbDrillUseCase {
  constructor(
    private readonly verbs: IVerbSource,
    private readonly random: IRandomSource,
  ) {}

  async execute(input: IGetVerbDrillInput): Promise<IVerbDrill> {
    const all = this.verbs.listAll();
    const pool = input.coreOnly === true ? all.filter((verb) => verb.isCore) : all;
    const wanted = Math.min(MAX_QUESTIONS, Math.max(1, input.count));

    return Promise.resolve({
      questions: this.sample(pool.length === 0 ? all : pool, wanted).flatMap((verb) => {
        const question = this.ask(verb);

        return question === null ? [] : [question];
      }),
      totalVerbs: all.length,
    });
  }

  /**
   * One question, or nothing.
   *
   * Nothing when the verb cannot produce four distinct options — `cut / cut /
   * cut` has only three different words across all five forms, and a
   * three-option question sitting beside four-option ones reads as a bug. It
   * costs a question out of six on a screen whose job is to look right.
   */
  private ask(verb: Verb): IVerbDrillQuestion | null {
    const target = TARGETS[this.random.below(TARGETS.length)] ?? TARGETS[0];
    const answer = target.of(verb).form;

    const pool: string[] = [];
    const rejected = new Set<string>([answer]);

    for (const candidate of [...verb.forms, this.regularised(verb)]) {
      if (candidate === null || rejected.has(candidate)) {
        continue;
      }

      rejected.add(candidate);
      pool.push(candidate);
    }

    if (pool.length < OPTIONS - 1) {
      return null;
    }

    const options = [answer, ...this.take(pool, OPTIONS - 1)];

    // Fisher-Yates over four items, tracking the answer through the swaps
    // rather than searching for it afterwards.
    let answerIndex = 0;

    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = this.random.below(i + 1);
      const a = options[i];
      const b = options[j];

      if (a === undefined || b === undefined) {
        continue;
      }

      options[i] = b;
      options[j] = a;

      if (answerIndex === i) {
        answerIndex = j;
      } else if (answerIndex === j) {
        answerIndex = i;
      }
    }

    return {
      base: verb.base,
      target: target.key,
      targetName: target.name,
      options,
      answerIndex,
      rule: target.of(verb).rule,
      forms: verb.forms,
      banglaMeaning: verb.banglaMeaning,
      isIrregular: verb.isIrregular,
    };
  }

  /**
   * `writed` — the past this verb would have if English were consistent.
   *
   * Offered only for irregular verbs, and only as a wrong answer. For a regular
   * verb it *is* the past, so returning it would put the right answer in the
   * pool twice under two names.
   */
  private regularised(verb: Verb): string | null {
    if (!verb.isIrregular) {
      return null;
    }

    const base = verb.base;

    if (base.endsWith('e')) {
      return `${base}d`;
    }

    return `${base}ed`;
  }

  /** `count` distinct members of a pool, chosen at random. */
  private take(pool: readonly string[], count: number): readonly string[] {
    const remaining = [...pool];
    const taken: string[] = [];

    while (taken.length < count && remaining.length > 0) {
      const [picked] = remaining.splice(this.random.below(remaining.length), 1);

      if (picked !== undefined) {
        taken.push(picked);
      }
    }

    return taken;
  }

  /**
   * `count` distinct verbs, chosen at random.
   *
   * A partial Fisher-Yates over a copy — it touches `count` positions rather
   * than shuffling 998 verbs to keep six.
   */
  private sample(pool: readonly Verb[], count: number): readonly Verb[] {
    const remaining = [...pool];
    const taken: Verb[] = [];

    while (taken.length < count && remaining.length > 0) {
      const [picked] = remaining.splice(this.random.below(remaining.length), 1);

      if (picked !== undefined) {
        taken.push(picked);
      }
    }

    return taken;
  }
}
