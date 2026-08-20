import { type IMasteryMatrixCell } from '@/components/data/mastery-matrix';

/**
 * Gallery fixtures — the real 44 symbols and the real 24 rule-family codes,
 * copied from `content/phonemes.ts` and `content/rule-families.ts`.
 *
 * Copied rather than imported: `content/` is the seeding pipeline's source and
 * sits outside `src`, so importing it from a route would pull the whole course
 * corpus into the app's module graph to render a demo. The labels are the only
 * part the matrix uses, and a drifted label here shows up as a wrong-looking
 * gallery, never as wrong data on a learner's screen.
 *
 * The accuracies are deterministic, not random: a gallery whose colours change
 * on every reload cannot be compared against yesterday's screenshot.
 */
const PHONEME_SYMBOLS: readonly string[] = [
  'iː',
  'ɪ',
  'e',
  'æ',
  'ɑː',
  'ɒ',
  'ɔː',
  'ʊ',
  'uː',
  'ʌ',
  'ɜː',
  'ə',
  'eɪ',
  'aɪ',
  'ɔɪ',
  'aʊ',
  'əʊ',
  'ɪə',
  'eə',
  'ʊə',
  'p',
  'b',
  't',
  'd',
  'k',
  'ɡ',
  'tʃ',
  'dʒ',
  'f',
  'v',
  'θ',
  'ð',
  's',
  'z',
  'ʃ',
  'ʒ',
  'h',
  'm',
  'n',
  'ŋ',
  'l',
  'r',
  'w',
  'j',
];

const RULE_FAMILY_CODES: readonly string[] = [
  'doubling_1_1_1',
  'drop_silent_e',
  'y_to_i',
  'i_before_e',
  'plural_es',
  'f_to_ves',
  'silent_letters',
  'tion_sion',
  'able_ible',
  'soft_c',
  'soft_g',
  'q_takes_u',
  'ck_after_short_vowel',
  'tch_after_short_vowel',
  'dge_after_short_vowel',
  'no_final_v',
  'floss_doubling',
  'prefix_keeps_root',
  'suffix_ful_one_l',
  'subject_verb_agreement',
  'article_a_an',
  'fewer_less',
  'place_prepositions',
  'ed_pronunciation',
];

/** A repeatable spread across the ramp, so all five heat steps are on screen. */
function syntheticAccuracy(index: number): number {
  return ((index * 37) % 101) / 100;
}

function build(labels: readonly string[], basePath: string): readonly IMasteryMatrixCell[] {
  return labels.map((label, index) => {
    const accuracy = syntheticAccuracy(index);
    const attempts = 4 + ((index * 7) % 23);

    return {
      dimensionId: `${basePath}-${String(index)}`,
      label,
      attempts,
      correct: Math.round(accuracy * attempts),
      accuracy,
      isWeakness: accuracy < 0.6,
      drillHref: `/practice?focus=${encodeURIComponent(label)}`,
    };
  });
}

export const PHONEME_CELLS: readonly IMasteryMatrixCell[] = build(PHONEME_SYMBOLS, 'phoneme');

export const RULE_FAMILY_CELLS: readonly IMasteryMatrixCell[] = build(
  RULE_FAMILY_CODES,
  'rule-family',
);

/** Day one: 44 cells, no attempts, every border dashed. */
export const UNATTEMPTED_PHONEME_CELLS: readonly IMasteryMatrixCell[] = PHONEME_CELLS.map(
  (cell) => ({ ...cell, attempts: 0, correct: 0, accuracy: 0, isWeakness: false }),
);
