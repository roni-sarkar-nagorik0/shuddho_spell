import { ScorePercent } from '@/modules/shared/domain/value-objects/score-percent';
import { type ExamAnswer } from '../entities/exam-answer';
import { type ExamDefinition, type IExamSectionDefinition } from '../entities/exam-definition';
import { type ExamQuestion } from '../entities/exam-question';
import { type ExamSectionCode } from '../value-objects/exam-section-code';

const PERCENT = 100;

export interface IExamSectionScore {
  readonly code: ExamSectionCode;
  /** The section's share of the paper — 35, 20, 30, 15. */
  readonly weight: number;
  readonly awardedPoints: number;
  readonly possiblePoints: number;
  /** 0..100 **within the section**, before its weight is applied. */
  readonly percent: number;
}

export interface IExamScore {
  readonly scorePercent: ScorePercent;
  readonly sections: readonly IExamSectionScore[];
  /** The shape 004's `section_scores` jsonb holds. */
  readonly sectionScores: Readonly<Partial<Record<ExamSectionCode, number>>>;
  readonly passed: boolean;
}

/**
 * Turns a marked paper into a mark.
 *
 * **Zero I/O**, and that is the point rather than a style preference: this is
 * the calculation a learner's whole programme turns on, and it has to be
 * runnable against a table of numbers with no database, no clock and no
 * network. Everything it needs arrives as an argument.
 *
 * It scores what it is given and marks nothing. Deciding whether an answer was
 * right is a different question with different inputs — a dictation answer is a
 * string comparison and a pronunciation answer needs the speech scorer — and
 * mixing the two would make the weighting untestable without a scorer in scope.
 *
 * A section is a percentage **of itself** first, then weighted. The alternative
 * — pooling every question's points and weighting each question — sounds
 * equivalent and is not: it makes a section's influence depend on how many
 * questions it happens to contain, so a 60-question paper with 8 pronunciation
 * items would quietly score pronunciation at 13% instead of the 20% the
 * specification fixes.
 */
export class ExamScoringService {
  score(
    definition: ExamDefinition,
    questions: readonly ExamQuestion[],
    answers: readonly ExamAnswer[],
  ): IExamScore {
    const pointsByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

    const sections = definition.sections.map((section) =>
      this.scoreSection(section, questions, pointsByQuestion),
    );

    // A section the blueprint produced no questions for is dropped rather than
    // scored zero, and its weight is redistributed across the sections that do
    // exist. Zeroing it would charge the learner for a generation bug; keeping
    // it in the denominator would do the same thing more quietly.
    const scored = sections.filter((section) => section.possiblePoints > 0);
    const totalWeight = scored.reduce((sum, section) => sum + section.weight, 0);

    const weighted =
      totalWeight === 0
        ? 0
        : scored.reduce((sum, section) => sum + section.percent * section.weight, 0) / totalWeight;

    const scorePercent = ScorePercent.of(weighted);

    // Built by assignment rather than `Object.fromEntries`, which types its
    // result as a wide record and would need an `as` to narrow — and `as` is
    // allowed at a validated boundary only, which this is not.
    const sectionScores: Partial<Record<ExamSectionCode, number>> = {};

    for (const section of sections) {
      sectionScores[section.code] = section.percent;
    }

    return {
      scorePercent,
      sections,
      sectionScores,
      // `>=`, so a learner exactly on the pass mark passes. A boundary that
      // went the other way would fail somebody who scored precisely what was
      // asked of them, which no reading of "70% to pass" supports.
      passed: definition.passes(scorePercent.value),
    };
  }

  private scoreSection(
    section: IExamSectionDefinition,
    questions: readonly ExamQuestion[],
    answers: ReadonlyMap<string, ExamAnswer>,
  ): IExamSectionScore {
    const inSection = questions.filter((question) => question.sectionCode === section.code);

    const possiblePoints = inSection.reduce((sum, question) => sum + question.weight, 0);
    const awardedPoints = inSection.reduce(
      // An unanswered question is worth nothing and is not an error: a learner
      // who ran out of time has a blank, not a missing row.
      (sum, question) => sum + (answers.get(question.id)?.awardedPoints ?? 0),
      0,
    );

    return {
      code: section.code,
      weight: section.weight,
      awardedPoints,
      possiblePoints,
      percent:
        possiblePoints === 0
          ? 0
          : ScorePercent.of((awardedPoints / possiblePoints) * PERCENT).value,
    };
  }
}
