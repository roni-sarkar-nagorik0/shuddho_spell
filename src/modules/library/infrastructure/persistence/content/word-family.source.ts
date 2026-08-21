import { WORD_FAMILIES } from '../../../../../../content/word-families/index';
import { WordFamily } from '../../../domain/entities/word-family';
import { isIeltsSkill, type IeltsSkill } from '../../../domain/value-objects/ielts-skill';
import { type IWordFamilySource } from '../../../domain/repositories/word-family-source';

/**
 * The IELTS word families, read from the compiled content module.
 *
 * Built once at construction. The corpus is 412 families and cannot change
 * while the process is running, so rebuilding it per request would be 1,887
 * derivations done to reach the same answer.
 *
 * The skill strings are narrowed here rather than trusted. `content/` validates
 * them at build time, but this adapter is the boundary between a hand-written
 * corpus and a typed domain, and a boundary that assumes is not a boundary.
 */
export class WordFamilyContentSource implements IWordFamilySource {
  private readonly families: readonly WordFamily[] = WORD_FAMILIES.map((entry) =>
    WordFamily.create({
      root: entry.root,
      banglaMeaning: entry.banglaMeaning,
      ruleFamily: entry.ruleFamily,
      skills: entry.skills.filter((skill): skill is IeltsSkill => isIeltsSkill(skill)),
      topic: entry.topic,
      members: entry.members.map((member) => ({
        text: member.text,
        partOfSpeech: member.partOfSpeech,
      })),
    }),
  );

  listAll(): readonly WordFamily[] {
    return this.families;
  }
}
