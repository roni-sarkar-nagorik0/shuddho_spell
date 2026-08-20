import { type JsonValue } from '@/modules/shared/domain/value-objects/json-value';
import { type ExamDefinition } from '../entities/exam-definition';
import { type ExamQuestionType } from '../value-objects/exam-question-type';
import { type ExamSectionCode } from '../value-objects/exam-section-code';
import { seededUnitValue } from './seeded-random';

/**
 * Which question types a section may ask.
 *
 * Data, and not the same thing as the section codes: grammar-and-construction
 * draws on three different question types and the two dictation-shaped sections
 * draw on one each. A `switch` here would put the exam's shape inside a
 * function instead of in front of the reader.
 */
const TYPES_BY_SECTION: Readonly<Record<ExamSectionCode, readonly ExamQuestionType[]>> =
  Object.freeze({
    dictation: ['dictation'],
    pronunciation: ['pronunciation'],
    grammar_and_construction: ['multiple_choice', 'construction', 'cloze'],
    reading_to_writing: ['reading_response'],
  });

/**
 * How far a coin toss is allowed to move a candidate up the queue.
 *
 * Zero would make every attempt at an exam identical for a given learner —
 * the same weak words, forever, which is a paper they can memorise. One would
 * drown the weakness signal entirely and select at random. A third leaves
 * weakness clearly in charge while giving two attempts a week apart visibly
 * different papers.
 */
const JITTER = 0.35;

/** One thing the learner could be asked about, and how badly they need asking. */
export interface IExamItemCandidate {
  readonly itemId: string;
  readonly type: ExamQuestionType;
  /** What the learner is shown. */
  readonly payload: JsonValue;
  /** What marks it. Never leaves the server before submission. */
  readonly correctAnswer: JsonValue;
  /**
   * 0..1, where 1 is "gets this wrong every time".
   *
   * Derived by the caller from mastery and the review ladder — the blueprint
   * does not read a repository to find out, which is what keeps it pure.
   */
  readonly weakness: number;
}

/** A question the blueprint has decided on, before it becomes a row. */
export interface IBlueprintedQuestion {
  readonly sectionCode: ExamSectionCode;
  readonly orderIndex: number;
  readonly type: ExamQuestionType;
  readonly payload: JsonValue;
  readonly correctAnswer: JsonValue;
  readonly weight: number;
}

/** Every question counts the same. Weighting lives on the section — see F7.2. */
const EQUAL_WEIGHT = 1;

/**
 * Chooses an attempt's paper.
 *
 * Two properties, and they pull against each other on purpose. It is
 * **deterministic**: the same seed and the same pool produce the same paper,
 * every time, on any machine, so an attempt can be rebuilt from the `seed`
 * column for support or for a test. And it **prefers what the learner is weak
 * at**, because an exam drawn uniformly from 1,240 words measures luck.
 *
 * The reconciliation is a jittered sort rather than a shuffle: each candidate's
 * position is its weakness plus a keyed pseudo-random third. Weakness stays in
 * charge, two attempts a week apart look different, and both are reproducible.
 *
 * Zero I/O. The pool arrives as an argument, weakness already computed — the
 * caller reads the repositories, this decides.
 */
export class ExamBlueprintService {
  select(
    definition: ExamDefinition,
    seed: string,
    candidates: readonly IExamItemCandidate[],
  ): readonly IBlueprintedQuestion[] {
    return definition.sections.flatMap((section) => {
      const allowed = TYPES_BY_SECTION[section.code];

      const ranked = candidates
        .filter((candidate) => allowed.includes(candidate.type))
        .map((candidate) => ({
          candidate,
          // Keyed on the section too, so a word eligible for two sections does
          // not land at the same relative position in both.
          rank: candidate.weakness + seededUnitValue(seed, `${section.code}:${candidate.itemId}`) * JITTER,
        }))
        .sort((left, right) => right.rank - left.rank);

      // Fewer candidates than the section asks for is a content gap, not a
      // reason to fail: the paper is short and `ExamScoringService` scores the
      // section on what it actually contains.
      return ranked.slice(0, section.questionCount).map(
        (entry, index): IBlueprintedQuestion => ({
          sectionCode: section.code,
          orderIndex: index,
          type: entry.candidate.type,
          payload: entry.candidate.payload,
          correctAnswer: entry.candidate.correctAnswer,
          weight: EQUAL_WEIGHT,
        }),
      );
    });
  }
}
