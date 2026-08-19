import { type RuleFamily } from '../entities/rule-family';

export const RULE_FAMILY_REPOSITORY = Symbol('RULE_FAMILY_REPOSITORY');

export interface IRuleFamilyRepository {
  readonly findByIds: (ids: readonly string[]) => Promise<readonly RuleFamily[]>;

  /** All 24. Small, fixed and read on every progress screen. */
  readonly listAll: () => Promise<readonly RuleFamily[]>;
}
