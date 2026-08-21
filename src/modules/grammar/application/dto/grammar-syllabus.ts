import { type GrammarLevel } from '../../domain/entities/grammar-lesson';

export interface IGrammarSyllabusDay {
  readonly dayIndex: number;
  readonly title: string;
  readonly banglaTitle: string;
  readonly goal: string;
  readonly minutes: number;
}

export interface IGrammarSyllabusWeek {
  readonly weekIndex: number;
  readonly level: GrammarLevel;
  readonly minutes: number;
  readonly days: readonly IGrammarSyllabusDay[];
}

export interface IGrammarSyllabus {
  readonly weeks: readonly IGrammarSyllabusWeek[];
  readonly totalDays: number;
  readonly totalMinutes: number;
}
