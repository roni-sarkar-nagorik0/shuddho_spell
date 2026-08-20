import { type DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { type Track } from '@/modules/shared/domain/value-objects/track';
import { type ProgramDay } from '../entities/program-day';

export const PROGRAM_REPOSITORY = Symbol('PROGRAM_REPOSITORY');

export interface IProgramRepository {
  /**
   * One day, with its items already ordered and attached. The day and its items
   * are two tables and one question, so they are one call.
   */
  readonly findDay: (track: Track, dayIndex: DayIndex) => Promise<ProgramDay | null>;

  /**
   * Every day of a track, for the overview grid. Items are **not** loaded —
   * the overview shows titles and lengths, and pulling 28 days of items to
   * render 28 headings is the N+1 wearing a different hat.
   */
  readonly listDays: (track: Track) => Promise<readonly ProgramDay[]>;
}
