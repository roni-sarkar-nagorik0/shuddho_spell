import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IRuleFamilyRepository } from '../../domain/repositories/rule-family-repository';
import { type IWordRepository } from '../../domain/repositories/word-repository';
import { type ILibraryPage, type ILibraryWord } from '../dto/library-page';

export interface IGetLibraryPageInput {
  readonly userId: string;
  readonly after?: string;
  readonly pageSize: number;
  readonly contains?: string;
  readonly weekIndex?: number;
  readonly partOfSpeech?: string;
  readonly ruleFamilyId?: string;
}

/** A ceiling on what one request may ask for, whatever the query string says. */
const MAX_PAGE_SIZE = 100;

/**
 * A page of the word library, annotated with the learner's own record.
 *
 * **Keyset pagination.** The repository is asked for one row more than the page
 * size; if it comes back, there is a next page and its cursor is the last row
 * shown. That is one query per page rather than a query plus a count, and it
 * cannot disagree with itself the way a count taken a moment earlier can.
 *
 * Three reads, none per row: the page, the rule families once, and the
 * learner's review items once. `review_items` is the only per-learner state a
 * word carries, and a word absent from it has never been got wrong — reported
 * as `null` accuracy rather than 100%, because those are different claims.
 */
export class GetLibraryPageUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly words: IWordRepository,
    private readonly ruleFamilies: IRuleFamilyRepository,
    private readonly reviews: IReviewItemRepository,
  ) {}

  async execute(input: IGetLibraryPageInput): Promise<ILibraryPage> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize));

    const [rows, families, reviewItems] = await Promise.all([
      this.words.search({
        limit: pageSize + 1,
        ...(input.after === undefined ? {} : { after: input.after }),
        ...(input.contains === undefined ? {} : { contains: input.contains }),
        ...(input.weekIndex === undefined ? {} : { weekIndex: input.weekIndex }),
        ...(input.partOfSpeech === undefined ? {} : { partOfSpeech: input.partOfSpeech }),
        ...(input.ruleFamilyId === undefined ? {} : { ruleFamilyId: input.ruleFamilyId }),
      }),
      this.ruleFamilies.listAll(),
      this.reviews.findByProfile(profile.id),
    ]);

    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;

    const familyCodes = new Map(families.map((family) => [family.id, family.code] as const));
    const reviewByItem = new Map(reviewItems.map((item) => [item.itemId, item] as const));

    const words: readonly ILibraryWord[] = page.map((word) => {
      const review = reviewByItem.get(word.id);

      return {
        id: word.id,
        text: word.text,
        ipa: word.ipa.value,
        syllables: word.syllables,
        banglaSound: word.banglaSound,
        banglaMeaning: word.banglaMeaning,
        partOfSpeech: word.partOfSpeech,
        weekIndex: word.weekIndex,
        frequencyRank: word.frequencyRank,
        ruleFamilyCode: word.ruleFamilyId === null ? null : (familyCodes.get(word.ruleFamilyId) ?? null),
        accuracy:
          review === undefined || review.timesSeen === 0
            ? null
            : review.timesCorrect / review.timesSeen,
        timesSeen: review?.timesSeen ?? 0,
        isMastered: review?.isMastered ?? false,
      };
    });

    return {
      words,
      nextCursor: hasMore ? (words[words.length - 1]?.text ?? null) : null,
    };
  }
}
