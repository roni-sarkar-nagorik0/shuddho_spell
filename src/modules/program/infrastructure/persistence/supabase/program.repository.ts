import { type DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { type Track } from '@/modules/shared/domain/value-objects/track';
import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type ProgramDay } from '../../../domain/entities/program-day';
import { type IProgramRepository } from '../../../domain/repositories/program-repository';
import {
  PROGRAM_DAY_COLUMNS,
  PROGRAM_DAY_ITEM_COLUMNS,
  toProgramDay,
  toProgramDayItems,
  toProgramDays,
} from '../../mappers/program-day.mapper';

export class SupabaseProgramRepository implements IProgramRepository {
  constructor(private readonly db: IDatabase) {}

  /**
   * Two queries, never more: the day, then its items.
   *
   * Two rather than one because `IDatabase` cannot express a join — deliberately,
   * since a seam that could would be most of the way to the ORM this project
   * bans. Two round trips for a day is a fixed cost; what the N+1 rule forbids
   * is a cost that grows with the number of items, and this does not.
   */
  async findDay(track: Track, dayIndex: DayIndex): Promise<ProgramDay | null> {
    const dayRow = await this.db.selectOne({
      table: 'program_days',
      columns: PROGRAM_DAY_COLUMNS,
      eq: { track, day_index: dayIndex.value },
    });

    const withoutItems = toProgramDay(dayRow, []);

    if (withoutItems === null) {
      return null;
    }

    const itemRows = await this.db.select({
      table: 'program_day_items',
      columns: PROGRAM_DAY_ITEM_COLUMNS,
      eq: { program_day_id: withoutItems.id },
      orderBy: { column: 'order_index', ascending: true },
    });

    return toProgramDay(dayRow, toProgramDayItems(itemRows));
  }

  /** The overview grid: 28 headings, no items. One query. */
  async listDays(track: Track): Promise<readonly ProgramDay[]> {
    return toProgramDays(
      await this.db.select({
        table: 'program_days',
        columns: PROGRAM_DAY_COLUMNS,
        eq: { track },
        orderBy: { column: 'day_index', ascending: true },
      }),
    );
  }
}
