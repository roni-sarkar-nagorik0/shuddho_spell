import { VERBS } from '../../../../../../content/verb-forms/index';
import { Verb } from '../../../domain/entities/verb';
import { type IVerbSource } from '../../../domain/repositories/verb-source';

/**
 * The verbs, read from the compiled content module.
 *
 * Built once at construction, like the two content sources beside it. This one
 * has the most to gain from that: 998 verbs × three derivations is ~3,000 rule
 * applications, and doing them per request would be the same answer computed
 * again on every page of the reference.
 */
export class VerbContentSource implements IVerbSource {
  private readonly verbs: readonly Verb[] = VERBS.map((entry) =>
    Verb.create({
      base: entry.base,
      past: entry.past,
      participle: entry.participle,
      presentParticiple: entry.presentParticiple,
      thirdPerson: entry.thirdPerson,
      isCore: entry.isCore,
      banglaMeaning: entry.banglaMeaning,
      sense: entry.sense,
    }),
  );

  listAll(): readonly Verb[] {
    return this.verbs;
  }
}
