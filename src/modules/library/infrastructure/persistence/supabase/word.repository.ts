import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type Word } from '../../../domain/entities/word';
import { type IWordRepository } from '../../../domain/repositories/word-repository';
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
}
