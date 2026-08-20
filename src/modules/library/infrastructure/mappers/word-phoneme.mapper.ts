import { z } from 'zod';
import { parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { type IWordPhonemeLink } from '../../domain/value-objects/word-phoneme-link';

const rowSchema = z.object({
  word_id: z.string(),
  phoneme_id: z.string(),
  position: z.number().int(),
});

export const WORD_PHONEME_COLUMNS = 'word_id, phoneme_id, position';

export function toWordPhonemeLinks(rows: readonly unknown[]): readonly IWordPhonemeLink[] {
  return parseRows(rowSchema, rows).map((parsed) => ({
    wordId: parsed.word_id,
    phonemeId: parsed.phoneme_id,
    position: parsed.position,
  }));
}
