import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type RuleFamily } from '../../../domain/entities/rule-family';
import { type IRuleFamilyRepository } from '../../../domain/repositories/rule-family-repository';
import { RULE_FAMILY_COLUMNS, toRuleFamilies } from '../../mappers/rule-family.mapper';

export class SupabaseRuleFamilyRepository implements IRuleFamilyRepository {
  constructor(private readonly db: IDatabase) {}

  async findByIds(ids: readonly string[]): Promise<readonly RuleFamily[]> {
    return toRuleFamilies(
      await this.db.select({
        table: 'rule_families',
        columns: RULE_FAMILY_COLUMNS,
        whereIn: { column: 'id', values: ids },
      }),
    );
  }

  /** All 24. Ordered by code so the progress screen is stable between loads. */
  async listAll(): Promise<readonly RuleFamily[]> {
    return toRuleFamilies(
      await this.db.select({
        table: 'rule_families',
        columns: RULE_FAMILY_COLUMNS,
        orderBy: { column: 'code', ascending: true },
      }),
    );
  }
}
