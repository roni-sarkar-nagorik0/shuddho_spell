import { z } from 'zod';
import { parseRow, parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { SentenceItem } from '../../domain/entities/sentence-item';
import { DIFFICULTIES } from '../../domain/value-objects/difficulty';

const rowSchema = z.object({
  id: z.string(),
  bangla_text: z.string(),
  english_text: z.string(),
  accepted_alternatives: z.array(z.string()),
  distractor_words: z.array(z.string()),
  grammar_rule_family_ids: z.array(z.string()),
  difficulty: z.enum(DIFFICULTIES),
});

export const SENTENCE_ITEM_COLUMNS =
  'id, bangla_text, english_text, accepted_alternatives, distractor_words, grammar_rule_family_ids, difficulty';

function toEntity(parsed: z.infer<typeof rowSchema>): SentenceItem {
  return new SentenceItem(
    parsed.id,
    parsed.bangla_text,
    parsed.english_text,
    parsed.accepted_alternatives,
    parsed.distractor_words,
    parsed.grammar_rule_family_ids,
    parsed.difficulty,
  );
}

export function toSentenceItem(row: unknown): SentenceItem | null {
  const parsed = parseRow(rowSchema, row);

  return parsed === null ? null : toEntity(parsed);
}

export function toSentenceItems(rows: readonly unknown[]): readonly SentenceItem[] {
  return parseRows(rowSchema, rows).map(toEntity);
}

export function toSentenceItemRow(item: SentenceItem): Readonly<Record<string, unknown>> {
  return {
    id: item.id,
    bangla_text: item.banglaText,
    english_text: item.englishText,
    accepted_alternatives: [...item.acceptedAlternatives],
    distractor_words: [...item.distractorWords],
    grammar_rule_family_ids: [...item.grammarRuleFamilyIds],
    difficulty: item.difficulty,
  };
}
