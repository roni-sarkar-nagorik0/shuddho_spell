import { IELTS_VOCABULARY } from '../../../../../../content/ielts-vocabulary/index';
import { VocabularyEntry } from '../../../domain/entities/vocabulary-entry';
import { type IVocabularySource } from '../../../domain/repositories/vocabulary-source';

/**
 * The IELTS vocabulary pairs, read from the compiled content module.
 *
 * Built once at construction, like the families source beside it: 777 entries
 * that cannot change while the process is running, so rebuilding them per
 * request would be the same 777 objects allocated to reach the same answer.
 */
export class VocabularyContentSource implements IVocabularySource {
  private readonly entries: readonly VocabularyEntry[] = IELTS_VOCABULARY.map((entry) =>
    VocabularyEntry.create({
      word: entry.word,
      partOfSpeech: entry.partOfSpeech,
      synonyms: entry.synonyms,
      topic: entry.topic,
    }),
  );

  listAll(): readonly VocabularyEntry[] {
    return this.entries;
  }
}
