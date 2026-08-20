import { type ReviewItem } from '../entities/review-item';

export const REVIEW_ITEM_REPOSITORY = Symbol('REVIEW_ITEM_REPOSITORY');

export interface IReviewItemRepository {
  /**
   * Everything due for this learner at this instant.
   *
   * **Unlimited on purpose.** The cap of 25 is a product decision from
   * `06-spaced-repetition.md`, and the ordering it caps by — most overdue
   * first, ties by lowest accuracy — is domain logic. Pushing `limit` into SQL
   * would move that rule into the adapter, where it is neither testable with
   * fakes nor visible to anyone reading the use case.
   */
  readonly findDue: (profileId: string, now: Date) => Promise<readonly ReviewItem[]>;

  readonly findByItem: (profileId: string, itemId: string) => Promise<ReviewItem | null>;

  /**
   * Creates or updates by `(profile_id, item_id)`. A wrong answer on a word the
   * learner has never reviewed and one they have are the same call — the caller
   * should not have to ask which, and the unique index makes the database
   * decide.
   */
  readonly upsert: (item: ReviewItem) => Promise<ReviewItem>;

  readonly countDue: (profileId: string, now: Date) => Promise<number>;

  /**
   * Everything the learner has ever reviewed, due or not.
   *
   * The exam blueprint's evidence: an item's accuracy is how weak the learner
   * is on it, and an item absent from this list is one they have never been
   * tested on. Read whole and once, at attempt start.
   */
  readonly findByProfile: (profileId: string) => Promise<readonly ReviewItem[]>;
}
