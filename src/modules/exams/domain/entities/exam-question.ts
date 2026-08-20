import { type JsonValue } from '@/modules/shared/domain/value-objects/json-value';
import { type ExamQuestionType } from '../value-objects/exam-question-type';
import { type ExamSectionCode } from '../value-objects/exam-section-code';

/**
 * A question as a learner may see it. **No `correctAnswer` field exists here**,
 * which is what makes rule 3 structural rather than procedural: there is no
 * key to forget to delete, and a handler cannot leak a field its type does not
 * have.
 */
export interface IExamQuestionForLearner {
  readonly id: string;
  readonly sectionCode: ExamSectionCode;
  readonly orderIndex: number;
  readonly type: ExamQuestionType;
  readonly payload: JsonValue;
  readonly weight: number;
}

export interface IExamQuestionProps {
  readonly id: string;
  readonly attemptId: string;
  readonly sectionCode: ExamSectionCode;
  readonly orderIndex: number;
  readonly type: ExamQuestionType;
  /** What the learner is shown. Safe to serialise, always. */
  readonly payload: JsonValue;
  /** What marks it. Safe to serialise **only after submission** — see below. */
  readonly correctAnswer: JsonValue;
  readonly weight: number;
}

/**
 * One question on one attempt.
 *
 * Questions belong to an **attempt**, not to a definition: the blueprint picks
 * them per learner from the attempt's seed, so two people sitting `milestone1`
 * are not sitting the same paper and neither can be coached through it.
 *
 * `correctAnswer` lives here because marking happens on the server and needs it.
 * Rule 3 of `08-exam-engine.md` is that it appears in **no response body before
 * submission**, and the way that is kept is that no presentation DTO in this
 * module has a field for it — the entity is never serialised directly. See
 * `forLearner()`, which is the only shape a handler is given.
 */
export class ExamQuestion {
  readonly id: string;
  readonly attemptId: string;
  readonly sectionCode: ExamSectionCode;
  readonly orderIndex: number;
  readonly type: ExamQuestionType;
  readonly payload: JsonValue;
  readonly correctAnswer: JsonValue;
  readonly weight: number;

  constructor(props: IExamQuestionProps) {
    this.id = props.id;
    this.attemptId = props.attemptId;
    this.sectionCode = props.sectionCode;
    this.orderIndex = props.orderIndex;
    this.type = props.type;
    this.payload = props.payload;
    this.correctAnswer = props.correctAnswer;
    this.weight = props.weight;
  }

  /**
   * The question with its answer removed, structurally.
   *
   * A new object built field by field rather than a spread with a `delete`: a
   * spread copies whatever is added to the entity later, and the next field
   * somebody adds is as likely to be `explanation` as `hint`. Anything that must
   * not leak has to be **absent by construction**, not removed afterwards.
   */
  forLearner(): IExamQuestionForLearner {
    return {
      id: this.id,
      sectionCode: this.sectionCode,
      orderIndex: this.orderIndex,
      type: this.type,
      payload: this.payload,
      weight: this.weight,
    };
  }
}
