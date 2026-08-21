import {
  type GrammarLevel,
  type IGrammarCheck,
  type IGrammarMistake,
  type IGrammarSection,
} from '../../domain/entities/grammar-lesson';

/** Where the previous and next day sit, so the screen can offer them by name. */
export interface IGrammarNeighbour {
  readonly dayIndex: number;
  readonly title: string;
}

export interface IGrammarLessonView {
  readonly dayIndex: number;
  readonly weekIndex: number;
  readonly level: GrammarLevel;
  readonly title: string;
  readonly banglaTitle: string;
  readonly goal: string;
  readonly ieltsWhy: string;
  readonly minutes: number;
  readonly sections: readonly IGrammarSection[];
  readonly mistakes: readonly IGrammarMistake[];
  readonly ieltsMoves: readonly string[];
  readonly checks: readonly IGrammarCheck[];
  readonly previous: IGrammarNeighbour | null;
  readonly next: IGrammarNeighbour | null;
}
