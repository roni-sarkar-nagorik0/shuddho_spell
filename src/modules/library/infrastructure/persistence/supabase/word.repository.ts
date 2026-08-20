import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type Word } from '../../../domain/entities/word';
import { type IWordRepository, type IWordSearch } from '../../../domain/repositories/word-repository';
import { WORD_COLUMNS, toWord, toWords } from '../../mappers/word.mapper';

export class SupabaseWordRepository implements IWordRepository {
  constructor(private readonly db: IDatabase) {}

  async findById(id: string): Promise<Word | null> {
    return toWord(await this.db.selectOne({ table: 'words', columns: WORD_COLUMNS, eq: { id } }));
  }

  /**
   * One query for a whole lesson day's vocabulary. The adapter short-circuits
   * an empty id list rather than asking Postgres to confirm that `in ()`
   * matches nothing.
   */
  async findByIds(ids: readonly string[]): Promise<readonly Word[]> {
    return toWords(
      await this.db.select({
        table: 'words',
        columns: WORD_COLUMNS,
        whereIn: { column: 'id', values: ids },
      }),
    );
  }

  /**
   * `week_index <= n`. Expressed through `lte` rather than a list of weeks
   * because `IDatabase.whereIn` takes strings and a week is a number — and
   * because "everything up to here" is what an exam actually wants.
   */
  async findUpToWeek(weekIndex: number): Promise<readonly Word[]> {
    return toWords(
      await this.db.select({
        table: 'words',
        columns: WORD_COLUMNS,
        lte: { column: 'week_index', value: String(weekIndex) },
      }),
    );
  }

  /**
   * Ordered by `text` ascending, which is both the sort the library shows and
   * the cursor it pages on — a keyset needs the order and the cursor column to
   * be the same one, or the page after the cursor is not the page below it.
   *
   * `%` is escaped in the search term. A learner typing `%` would otherwise
   * match every row, which is confusing rather than dangerous — PostgREST
   * parameterises the value either way.
   */
  async search(options: IWordSearch): Promise<readonly Word[]> {
    const eq: Record<string, string | number> = {};

    if (options.weekIndex !== undefined) {
      eq['week_index'] = options.weekIndex;
    }

    if (options.partOfSpeech !== undefined) {
      eq['part_of_speech'] = options.partOfSpeech;
    }

    if (options.ruleFamilyId !== undefined) {
      eq['rule_family_id'] = options.ruleFamilyId;
    }

    return toWords(
      await this.db.select({
        table: 'words',
        columns: WORD_COLUMNS,
        eq,
        orderBy: { column: 'text', ascending: true },
        limit: options.limit,
        ...(options.after === undefined ? {} : { gt: { column: 'text', value: options.after } }),
        ...(options.contains === undefined || options.contains === ''
          ? {}
          : { ilike: { column: 'text', pattern: `%${options.contains.replace(/[%_]/gu, '')}%` } }),
      }),
    );
  }
}
