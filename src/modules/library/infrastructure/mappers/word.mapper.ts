import { z } from 'zod';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { parseRow, parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { Word } from '../../domain/entities/word';
import { PARTS_OF_SPEECH } from '../../domain/value-objects/part-of-speech';

/**
 * The only place that knows `words` is snake_case.
 *
 * `part_of_speech` is checked against the union rather than taken as a string,
 * so a tenth value added to 002's constraint cannot arrive in the domain
 * unnoticed — the row is dropped and the gap is visible, which beats a `Word`
 * carrying a part of speech nothing can render.
 */
const rowSchema = z.object({
  id: z.string(),
  text: z.string(),
  ipa: z.string(),
  syllables: z.array(z.string()),
  bangla_sound: z.string(),
  bangla_meaning: z.string(),
  part_of_speech: z.enum(PARTS_OF_SPEECH),
  rule_family_id: z.string().nullable(),
  week_index: z.number().int(),
  frequency_rank: z.number().int().nullable(),
  common_misspellings: z.array(z.string()),
});

export const WORD_COLUMNS =
  'id, text, ipa, syllables, bangla_sound, bangla_meaning, part_of_speech, rule_family_id, week_index, frequency_rank, common_misspellings';

function toEntity(parsed: z.infer<typeof rowSchema>): Word {
  return new Word(
    parsed.id,
    parsed.text,
    IpaTranscription.of(parsed.ipa),
    parsed.syllables,
    parsed.bangla_sound,
    parsed.bangla_meaning,
    parsed.part_of_speech,
    parsed.rule_family_id,
    parsed.week_index,
    parsed.frequency_rank,
    parsed.common_misspellings,
  );
}

export function toWord(row: unknown): Word | null {
  const parsed = parseRow(rowSchema, row);

  return parsed === null ? null : toEntity(parsed);
}

export function toWords(rows: readonly unknown[]): readonly Word[] {
  return parseRows(rowSchema, rows).map(toEntity);
}

/**
 * The other direction. Words are content — seeded, never written by a learner —
 * so this exists for the content pipeline in Phase 9 and for the round-trip
 * check that says the two halves agree.
 */
export function toWordRow(word: Word): Readonly<Record<string, unknown>> {
  return {
    id: word.id,
    text: word.text,
    ipa: word.ipa.value,
    syllables: [...word.syllables],
    bangla_sound: word.banglaSound,
    bangla_meaning: word.banglaMeaning,
    part_of_speech: word.partOfSpeech,
    rule_family_id: word.ruleFamilyId,
    week_index: word.weekIndex,
    frequency_rank: word.frequencyRank,
    common_misspellings: [...word.commonMisspellings],
  };
}
