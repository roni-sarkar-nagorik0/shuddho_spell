import { z } from 'zod';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { Phoneme } from '../../domain/entities/phoneme';
import { PHONEME_TYPES } from '../../domain/value-objects/phoneme-type';

const rowSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  type: z.enum(PHONEME_TYPES),
  /** Null means Bangla lacks the sound. Data, not a gap — 002 says so. */
  bangla_equivalent: z.string().nullable(),
  articulation_note: z.string(),
  common_bengali_substitution: z.string().nullable(),
});

export const PHONEME_COLUMNS =
  'id, symbol, type, bangla_equivalent, articulation_note, common_bengali_substitution';

export function toPhonemes(rows: readonly unknown[]): readonly Phoneme[] {
  return parseRows(rowSchema, rows).map(
    (parsed) =>
      new Phoneme(
        parsed.id,
        IpaTranscription.of(parsed.symbol),
        parsed.type,
        parsed.bangla_equivalent,
        parsed.articulation_note,
        parsed.common_bengali_substitution,
      ),
  );
}

export function toPhonemeRow(phoneme: Phoneme): Readonly<Record<string, unknown>> {
  return {
    id: phoneme.id,
    symbol: phoneme.symbol.value,
    type: phoneme.type,
    bangla_equivalent: phoneme.banglaEquivalent,
    articulation_note: phoneme.articulationNote,
    common_bengali_substitution: phoneme.commonBengaliSubstitution,
  };
}
