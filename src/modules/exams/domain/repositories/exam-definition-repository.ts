import { type ExamDefinition } from '../entities/exam-definition';
import { type ExamCode } from '../value-objects/exam-code';

export const EXAM_DEFINITION_REPOSITORY = Symbol('EXAM_DEFINITION_REPOSITORY');

export interface IExamDefinitionRepository {
  /**
   * One definition **with its sections attached**. Two tables, one question —
   * a definition without its weights cannot score anything, so there is no
   * caller who wants half of it and no reason to make them ask twice.
   */
  readonly findByCode: (code: ExamCode) => Promise<ExamDefinition | null>;

  readonly findById: (id: string) => Promise<ExamDefinition | null>;

  /** All five, for the catalogue. Sections attached, for the same reason. */
  readonly listAll: () => Promise<readonly ExamDefinition[]>;
}
