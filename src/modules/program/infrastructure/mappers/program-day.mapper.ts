import { z } from 'zod';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { ITEM_TYPES } from '@/modules/shared/domain/value-objects/item-type';
import { TRACKS } from '@/modules/shared/domain/value-objects/track';
import { parseRow, parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { ProgramDay, type IProgramDayItem } from '../../domain/entities/program-day';

const dayRowSchema = z.object({
  id: z.string(),
  track: z.enum(TRACKS),
  day_index: z.number().int(),
  week_index: z.number().int(),
  title: z.string(),
  description: z.string(),
  estimated_minutes: z.number().int(),
});

const itemRowSchema = z.object({
  program_day_id: z.string(),
  item_type: z.enum(ITEM_TYPES),
  item_id: z.string(),
  order_index: z.number().int(),
});

export const PROGRAM_DAY_COLUMNS =
  'id, track, day_index, week_index, title, description, estimated_minutes';

export const PROGRAM_DAY_ITEM_COLUMNS = 'program_day_id, item_type, item_id, order_index';

export function toProgramDayItems(rows: readonly unknown[]): readonly IProgramDayItem[] {
  // Sorted here rather than trusted from the query. The entity's contract says
  // its items are ascending by `orderIndex`, and a day is a sequence — an
  // adapter that forgot the `order by` would produce a lesson that plays its
  // stages in whatever order Postgres felt like.
  return parseRows(itemRowSchema, rows)
    .map((parsed) => ({
      itemType: parsed.item_type,
      itemId: parsed.item_id,
      orderIndex: parsed.order_index,
    }))
    .sort((left, right) => left.orderIndex - right.orderIndex);
}

export function toProgramDay(row: unknown, items: readonly IProgramDayItem[]): ProgramDay | null {
  const parsed = parseRow(dayRowSchema, row);

  if (parsed === null) {
    return null;
  }

  return new ProgramDay(
    parsed.id,
    parsed.track,
    DayIndex.of(parsed.day_index),
    parsed.week_index,
    parsed.title,
    parsed.description,
    parsed.estimated_minutes,
    items,
  );
}

/** Days without their items, for the overview grid. */
export function toProgramDays(rows: readonly unknown[]): readonly ProgramDay[] {
  return parseRows(dayRowSchema, rows).map(
    (parsed) =>
      new ProgramDay(
        parsed.id,
        parsed.track,
        DayIndex.of(parsed.day_index),
        parsed.week_index,
        parsed.title,
        parsed.description,
        parsed.estimated_minutes,
        [],
      ),
  );
}

export function toProgramDayRow(day: ProgramDay): Readonly<Record<string, unknown>> {
  return {
    id: day.id,
    track: day.track,
    day_index: day.dayIndex.value,
    week_index: day.weekIndex,
    title: day.title,
    description: day.description,
    estimated_minutes: day.estimatedMinutes,
  };
}
