import { EXAMS } from './exams';
import { PHONEMES } from './phonemes';
import { RULE_FAMILIES } from './rule-families';
import { validateContent, type IValidationResult } from './validate';
import { WEEK_01 } from './week-01';
import { WEEK_02 } from './week-02';
import { WEEK_03 } from './week-03';
import { WEEK_04 } from './week-04';

export const WEEKS = [WEEK_01, WEEK_02, WEEK_03, WEEK_04] as const;

export { EXAMS, PHONEMES, RULE_FAMILIES };

/**
 * Validates the whole corpus, every time it is imported.
 *
 * `10-content-pipeline.md` asks for a malformed entry to fail **the build**,
 * naming the file and the entry. Running at module load is what makes that
 * true: `pnpm content:validate` runs before `pnpm build` (see `prebuild`), and
 * a bad word cannot reach a deploy by way of nobody having run the right
 * script.
 */
export function readContent(): IValidationResult {
  return validateContent({
    phonemes: PHONEMES,
    ruleFamilies: RULE_FAMILIES,
    weeks: WEEKS,
    exams: EXAMS,
  });
}
