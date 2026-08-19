import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IPhonemeRepository } from '@/modules/library/domain/repositories/phoneme-repository';
import { type IRuleFamilyRepository } from '@/modules/library/domain/repositories/rule-family-repository';
import { type MasteryRecord } from '../../domain/entities/mastery-record';
import { type IMasteryRepository } from '../../domain/repositories/mastery-repository';
import { MasteryCalculator } from '../../domain/services/mastery-calculator';
import { type IMasteryCell, type IMasterySnapshot } from '../dto/mastery-snapshot';

export interface IGetMasterySnapshotInput {
  readonly userId: string;
}

/**
 * The mastery matrix: every sound and every rule, with how the learner is doing.
 *
 * Four queries regardless of size — profile, records, all 44 phonemes, all 24
 * rule families. Those two lists are small, fixed and read on every progress
 * screen, which is why their ports offer `listAll` rather than making this
 * assemble ids and fetch by them.
 */
export class GetMasterySnapshotUseCase {
  private readonly calculator = new MasteryCalculator();

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly mastery: IMasteryRepository,
    private readonly phonemes: IPhonemeRepository,
    private readonly ruleFamilies: IRuleFamilyRepository,
  ) {}

  async execute(input: IGetMasterySnapshotInput): Promise<IMasterySnapshot> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const [records, phonemes, ruleFamilies] = await Promise.all([
      this.mastery.findByProfile(profile.id),
      this.phonemes.listAll(),
      this.ruleFamilies.listAll(),
    ]);

    const labels = new Map<string, string>([
      ...phonemes.map((phoneme): readonly [string, string] => [phoneme.id, phoneme.symbol.value]),
      ...ruleFamilies.map((family): readonly [string, string] => [family.id, family.code]),
    ]);

    const toCell = (record: MasteryRecord): IMasteryCell => ({
      dimensionId: record.dimensionId,
      // An unlabelled cell means content was removed while a record still
      // points at it. The id is a worse label than a name and a better one
      // than a blank cell nobody can act on.
      label: labels.get(record.dimensionId) ?? record.dimensionId,
      attempts: record.attempts,
      correct: record.correct,
      accuracy: record.accuracy().value,
      isWeakness: record.isWeakness(),
    });

    return {
      phonemes: records.filter((r) => r.dimension === 'phoneme').map(toCell),
      ruleFamilies: records.filter((r) => r.dimension === 'rule_family').map(toCell),
      weaknesses: this.calculator.weaknesses(records).map(toCell),
    };
  }
}
