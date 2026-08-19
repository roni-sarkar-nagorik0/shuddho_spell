import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type ReviewItem } from '../../../domain/entities/review-item';
import { type IReviewItemRepository } from '../../../domain/repositories/review-item-repository';
import {
  REVIEW_ITEM_COLUMNS,
  toReviewItem,
  toReviewItemRow,
  toReviewItems,
} from '../../mappers/review-item.mapper';

const TABLE = 'review_items';

export class SupabaseReviewItemRepository implements IReviewItemRepository {
  constructor(private readonly db: IDatabase) {}

  /**
   * Everything due, unordered and uncapped.
   *
   * The cap of 25 and the most-overdue-first ordering stay in the use case on
   * purpose — they are product rules from `06-spaced-repetition.md`, and in SQL
   * they would be invisible to anyone reading the use case and untestable with
   * a fake. What the adapter contributes is the filter, which is genuinely the
   * database's job.
   */
  async findDue(profileId: string, now: Date): Promise<readonly ReviewItem[]> {
    return toReviewItems(
      await this.db.select({
        table: TABLE,
        columns: REVIEW_ITEM_COLUMNS,
        eq: { profile_id: profileId },
        lte: { column: 'due_at', value: now.toISOString() },
      }),
    );
  }

  async findByItem(profileId: string, itemId: string): Promise<ReviewItem | null> {
    return toReviewItem(
      await this.db.selectOne({
        table: TABLE,
        columns: REVIEW_ITEM_COLUMNS,
        eq: { profile_id: profileId, item_id: itemId },
      }),
    );
  }

  /**
   * On `(profile_id, item_type, item_id)` — 003's `review_items_profile_item_unique`,
   * all three columns. The conflict target has to match the index exactly or
   * Postgres refuses the statement, and it is `item_type` that is easy to miss.
   * A wrong answer on a word never reviewed and one reviewed ten times are the
   * same call; the database decides which it was.
   *
   * `ignoreDuplicates: false` — a conflict here *should* update. That is the
   * opposite of the profile bootstrap, where a conflict means somebody else
   * already wrote the row and it must be left alone.
   */
  async upsert(item: ReviewItem): Promise<ReviewItem> {
    await this.db.upsert(TABLE, [toReviewItemRow(item)], {
      onConflict: 'profile_id, item_type, item_id',
      ignoreDuplicates: false,
    });

    return item;
  }

  /** A count, not a fetch-and-length. The dashboard shows a number. */
  async countDue(profileId: string, now: Date): Promise<number> {
    return this.db.count({
      table: TABLE,
      columns: 'id',
      eq: { profile_id: profileId },
      lte: { column: 'due_at', value: now.toISOString() },
    });
  }
}
