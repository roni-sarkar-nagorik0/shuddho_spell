import { type MasteryRecord } from '@/modules/progress/domain/entities/mastery-record';
import { type MasteryDimension } from '@/modules/progress/domain/value-objects/mastery-dimension';
import { ScorePercent } from '@/modules/shared/domain/value-objects/score-percent';
import { type ExamAttempt } from '../entities/exam-attempt';
import { type ExamDefinition } from '../entities/exam-definition';
import { type ExamSectionCode } from '../value-objects/exam-section-code';

const PERCENT = 100;

/** `08-exam-engine.md`: the **three** topics most likely to cost marks. */
const COSTLIEST_TOPICS = 3;

/**
 * Which kind of evidence speaks for which section.
 *
 * Pronunciation is measured by phonemes and everything else by rule families,
 * which is exactly the split `MasteryDimension` already draws — a learner is
 * weak at *sounds* or weak at *rules*, and the two need different remedies.
 * Reading-to-writing and grammar both come down to rules; dictation is spelling,
 * which the rule families are.
 */
const DIMENSION_BY_SECTION: Readonly<Record<ExamSectionCode, MasteryDimension>> = Object.freeze({
  dictation: 'rule_family',
  pronunciation: 'phoneme',
  grammar_and_construction: 'rule_family',
  reading_to_writing: 'rule_family',
});

/**
 * How much a previous attempt at **this exam** outweighs general mastery.
 *
 * Sitting the paper is better evidence about the paper than anything else, so
 * it dominates — but it does not erase what has happened since. A learner who
 * failed on Monday and has practised all week is not still that score.
 */
const PRIOR_ATTEMPT_WEIGHT = 0.6;

/** With nothing measured at all, the honest guess is the middle, not zero. */
const NO_EVIDENCE = 50;

export interface ICostlyTopic {
  readonly dimension: MasteryDimension;
  readonly dimensionId: string;
  readonly accuracyPercent: number;
  /**
   * Percentage points of the final score this topic is expected to lose.
   * Ranking on this and not on accuracy is the point — see below.
   */
  readonly expectedLoss: number;
}

export interface IExamReadiness {
  readonly predictedScorePercent: number;
  readonly passPercent: number | null;
  readonly likelyToPass: boolean | null;
  readonly perSection: readonly { readonly code: ExamSectionCode; readonly percent: number }[];
  readonly costliestTopics: readonly ICostlyTopic[];
}

/**
 * What the lobby tells a learner before they commit forty-five minutes.
 *
 * `08-exam-engine.md`: readiness "is what makes the exam lobby honest instead of
 * decorative". A lobby that says *Ready!* to somebody who will score 51% is
 * worse than one that says nothing, because they will believe it.
 *
 * The three topics are ranked by **expected loss**, not by accuracy. Those are
 * different orders and the difference is the whole value: a rule family at 40%
 * inside a 30%-weighted section costs more of the final mark than a phoneme at
 * 20% inside a 20%-weighted one, and telling a learner to go and drill the
 * phoneme would be advice that does not move the number they care about.
 *
 * Pure. Mastery, prior attempts and the definition all arrive as arguments.
 */
export class ExamReadinessService {
  predict(
    definition: ExamDefinition,
    mastery: readonly MasteryRecord[],
    priorAttempts: readonly ExamAttempt[],
  ): IExamReadiness {
    const lastScored = mostRecentScored(priorAttempts);

    const perSection = definition.sections.map((section) => {
      const fromMastery = meanAccuracy(mastery, DIMENSION_BY_SECTION[section.code]);
      const fromAttempt = lastScored?.sectionScores[section.code] ?? null;

      const percent =
        fromAttempt === null
          ? fromMastery
          : fromAttempt * PRIOR_ATTEMPT_WEIGHT + fromMastery * (1 - PRIOR_ATTEMPT_WEIGHT);

      return { code: section.code, percent: ScorePercent.of(percent).value };
    });

    const weightTotal = definition.sections.reduce((sum, section) => sum + section.weight, 0);

    const predicted =
      weightTotal === 0
        ? NO_EVIDENCE
        : definition.sections.reduce((sum, section) => {
            const estimate = perSection.find((entry) => entry.code === section.code)?.percent ?? 0;

            return sum + estimate * section.weight;
          }, 0) / weightTotal;

    const predictedScorePercent = ScorePercent.of(predicted).value;

    return {
      predictedScorePercent,
      passPercent: definition.passPercent,
      likelyToPass: definition.isGraded() ? definition.passes(predictedScorePercent) : null,
      perSection,
      costliestTopics: this.costliest(definition, mastery),
    };
  }

  /**
   * The three worth an evening's work, ordered by what they will actually cost.
   *
   * Fewer than three come back only when the learner has been measured on fewer
   * than three dimensions — a brand new account. Padding the list to three with
   * dimensions nobody has evidence for would be inventing advice.
   */
  private costliest(
    definition: ExamDefinition,
    mastery: readonly MasteryRecord[],
  ): readonly ICostlyTopic[] {
    const weightOf = (dimension: MasteryDimension): number =>
      definition.sections
        .filter((section) => DIMENSION_BY_SECTION[section.code] === dimension)
        .reduce((sum, section) => sum + section.weight, 0);

    // How much of that dimension's weight one topic carries. A learner with 44
    // measured phonemes has each of them accounting for a forty-fourth of the
    // pronunciation section, and pretending otherwise would rank a single
    // phoneme above a whole section's worth of rules.
    const countOf = (dimension: MasteryDimension): number =>
      Math.max(1, mastery.filter((record) => record.dimension === dimension).length);

    return [...mastery]
      .filter((record) => record.attempts > 0)
      .map((record): ICostlyTopic => {
        const share = weightOf(record.dimension) / countOf(record.dimension);

        return {
          dimension: record.dimension,
          dimensionId: record.dimensionId,
          accuracyPercent: record.accuracy().value,
          expectedLoss: ((PERCENT - record.accuracy().value) / PERCENT) * share,
        };
      })
      .sort((left, right) => right.expectedLoss - left.expectedLoss)
      .slice(0, COSTLIEST_TOPICS);
  }
}

function meanAccuracy(mastery: readonly MasteryRecord[], dimension: MasteryDimension): number {
  const measured = mastery.filter(
    (record) => record.dimension === dimension && record.attempts > 0,
  );

  if (measured.length === 0) {
    return NO_EVIDENCE;
  }

  return (
    measured.reduce((sum, record) => sum + record.accuracy().value, 0) / measured.length
  );
}

/** The most recent attempt that was actually marked. */
function mostRecentScored(attempts: readonly ExamAttempt[]): ExamAttempt | null {
  let latest: ExamAttempt | null = null;

  for (const attempt of attempts) {
    const submittedAt = attempt.submittedAt;

    if (
      submittedAt !== null &&
      attempt.scorePercent !== null &&
      (latest?.submittedAt == null || submittedAt.getTime() > latest.submittedAt.getTime())
    ) {
      latest = attempt;
    }
  }

  return latest;
}
