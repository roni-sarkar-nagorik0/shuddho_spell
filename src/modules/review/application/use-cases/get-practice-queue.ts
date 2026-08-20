import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
import { type IPhonemeRepository } from '@/modules/library/domain/repositories/phoneme-repository';
import { type IRuleFamilyRepository } from '@/modules/library/domain/repositories/rule-family-repository';
import { type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';
import { type IPracticeItem, type IPracticeQueue, type IPracticeWeakness } from '../dto/practice-queue';
import { type GetDueReviewItemsUseCase } from './get-due-review-items';

export interface IGetPracticeQueueInput {
  readonly userId: string;
  /** A `dimensionId` from a mastery matrix's drill action, when there is one. */
  readonly focusDimensionId?: string;
}

/**
 * Rule families whose failures show up as a particular error tag.
 *
 * The two vocabularies are separate on purpose — 003's `attempts_error_tags_known`
 * allowlist is nine diagnostic tags, `rule_families.code` is twenty-four
 * teachable rules — and this is the small, explicit bridge between them. It is
 * deliberately partial: a tag with no rule family listed simply does not raise
 * an item's priority, which is better than inventing a mapping.
 */
const TAG_TO_RULE_FAMILY: Readonly<Record<ErrorTag, readonly string[]>> = {
  DOUBLE_CONSONANT: ['doubling_1_1_1', 'floss_doubling'],
  SILENT_LETTER: ['silent_letters', 'drop_silent_e'],
  ARTICLE_MISSING: ['article_a_an'],
  V_W_SUBSTITUTION: [],
  TENSE_MISMATCH: ['subject_verb_agreement'],
  PREPOSITION_WRONG: ['place_prepositions'],
  WORD_ORDER: [],
  Y_TO_I: ['y_to_i'],
  TION_SION: ['tion_sion'],
};

/**
 * What to practise, chosen — **never sampled at random**.
 *
 * Two orderings, both derived from what the learner actually got wrong:
 *
 * - **Weaknesses** rank by expected loss (attempts × distance from mastery),
 *   not by accuracy. `08-exam-engine.md` makes the same distinction for exam
 *   readiness and gives the same reason: a dimension at 20% over three attempts
 *   is noise, and sending a learner to drill it wastes the session.
 * - **Items** are the spaced-repetition queue — every one of them is there
 *   because it was answered wrong — reordered so that anything whose last error
 *   tag maps to one of the learner's weakest rule families comes first, then
 *   the most overdue.
 *
 * Every item carries the `reason` it is where it is, so the screen can say why
 * rather than asking to be trusted.
 */
export class GetPracticeQueueUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly mastery: IMasteryRepository,
    private readonly phonemes: IPhonemeRepository,
    private readonly ruleFamilies: IRuleFamilyRepository,
    private readonly dueReviews: GetDueReviewItemsUseCase,
  ) {}

  async execute(input: IGetPracticeQueueInput): Promise<IPracticeQueue> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const [records, phonemes, families, queue] = await Promise.all([
      this.mastery.findByProfile(profile.id),
      this.phonemes.listAll(),
      this.ruleFamilies.listAll(),
      this.dueReviews.execute({ userId: input.userId }),
    ]);

    const labels = new Map<string, string>([
      ...phonemes.map((phoneme) => [phoneme.id, phoneme.symbol.value] as const),
      ...families.map((family) => [family.id, family.code] as const),
    ]);

    const weaknesses: readonly IPracticeWeakness[] = records
      .filter((record) => record.attempts > 0 && record.isWeakness())
      .map((record) => {
        const accuracy = record.correct / record.attempts;

        return {
          dimension: record.dimension,
          dimensionId: record.dimensionId,
          label: labels.get(record.dimensionId) ?? record.dimensionId,
          attempts: record.attempts,
          correct: record.correct,
          accuracy,
          expectedLoss: record.attempts * (1 - accuracy),
        };
      })
      .sort((a, b) => b.expectedLoss - a.expectedLoss);

    const weakFamilyCodes = new Set(
      weaknesses
        .filter((weakness) => weakness.dimension === 'rule_family')
        .map((weakness) => weakness.label),
    );

    const targetsAWeakness = (tags: readonly ErrorTag[]): boolean =>
      tags.some((tag) => TAG_TO_RULE_FAMILY[tag].some((code) => weakFamilyCodes.has(code)));

    const items: readonly IPracticeItem[] = [...queue.items]
      .map((item) => ({
        ...item,
        reason: targetsAWeakness(item.lastErrorTags)
          ? ('weakness' as const)
          : item.daysOverdue > 0
            ? ('overdue' as const)
            : ('due' as const),
      }))
      .sort((a, b) => {
        const byReason = RANK[a.reason] - RANK[b.reason];

        return byReason === 0 ? b.daysOverdue - a.daysOverdue : byReason;
      });

    const focus =
      input.focusDimensionId === undefined
        ? null
        : (weaknesses.find((weakness) => weakness.dimensionId === input.focusDimensionId) ?? null);

    return { weaknesses, items, totalDue: queue.totalDue, focus };
  }
}

const RANK: Readonly<Record<IPracticeItem['reason'], number>> = {
  weakness: 0,
  overdue: 1,
  due: 2,
};
