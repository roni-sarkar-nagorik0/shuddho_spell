import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import {
  type ExamDefinition,
  type IExamSectionDefinition,
} from '../../../domain/entities/exam-definition';
import { type IExamDefinitionRepository } from '../../../domain/repositories/exam-definition-repository';
import { type ExamCode } from '../../../domain/value-objects/exam-code';
import {
  EXAM_DEFINITION_COLUMNS,
  EXAM_SECTION_COLUMNS,
  toExamDefinition,
  toExamDefinitionIds,
  toExamDefinitions,
  toExamSections,
} from '../../mappers/exam-definition.mapper';

const DEFINITIONS = 'exam_definitions';
const SECTIONS = 'exam_sections';

/**
 * Two tables, two queries, one entity — never a query per definition.
 *
 * `IDatabase` cannot express a join by design (it is a narrowing, not an ORM),
 * so the sections arrive in one batched read filtered by the definition ids
 * already in hand. A constant two queries for the whole catalogue, not the six
 * a loop would make.
 */
export class SupabaseExamDefinitionRepository implements IExamDefinitionRepository {
  constructor(private readonly db: IDatabase) {}

  async findByCode(code: ExamCode): Promise<ExamDefinition | null> {
    return this.one({ code });
  }

  async findById(id: string): Promise<ExamDefinition | null> {
    return this.one({ id });
  }

  async listAll(): Promise<readonly ExamDefinition[]> {
    const rows = await this.db.select({
      table: DEFINITIONS,
      columns: EXAM_DEFINITION_COLUMNS,
      orderBy: { column: 'unlock_day_standard', ascending: true },
    });

    return toExamDefinitions(rows, await this.sectionsFor(toExamDefinitionIds(rows)));
  }

  private async one(eq: Readonly<Record<string, string>>): Promise<ExamDefinition | null> {
    const row = await this.db.selectOne({
      table: DEFINITIONS,
      columns: EXAM_DEFINITION_COLUMNS,
      eq,
    });

    const ids = toExamDefinitionIds([row]);
    const id = ids[0];

    if (id === undefined) {
      return null;
    }

    const sections = await this.sectionsFor([id]);

    return toExamDefinition(row, sections.get(id) ?? []);
  }

  private async sectionsFor(
    definitionIds: readonly string[],
  ): Promise<ReadonlyMap<string, readonly IExamSectionDefinition[]>> {
    const grouped = new Map<string, readonly IExamSectionDefinition[]>();

    if (definitionIds.length === 0) {
      return grouped;
    }

    const rows = await this.db.select({
      table: SECTIONS,
      columns: EXAM_SECTION_COLUMNS,
      whereIn: { column: 'definition_id', values: definitionIds },
      orderBy: { column: 'order_index', ascending: true },
    });

    for (const entry of toExamSections(rows)) {
      grouped.set(entry.definitionId, [...(grouped.get(entry.definitionId) ?? []), entry.section]);
    }

    return grouped;
  }
}
