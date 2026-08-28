/**
 * `pnpm content:report` — the phase-exit numbers, printed rather than claimed.
 *
 * `10-content-pipeline.md` asks for the counts to be verified and for the full
 * `ipaNeedsReview` list to be reported so a human can check it. This prints
 * both, plus the per-week breakdown and the distribution across the 28 days,
 * and it **exits non-zero when a target count is missed** — a report that only
 * described what was there would let 900 words pass as 3,000.
 *
 * The targets are **floors**, not exact counts, and they were not always: the
 * corpus grew from 1,240 to 3,000 words and an equality check turned that into
 * `MISS words 3000 / 1240` and a non-zero exit — a complete corpus reported as
 * incomplete. Nothing caught it because this script is not in `prebuild`. A
 * floor is what the claim actually is ("the course teaches at least this
 * much"), and it is the same shape as `WORD_FAMILY_MINIMUM_WORDS`.
 */
import process from 'node:process';
import { PHONEMES, RULE_FAMILIES, WEEKS, readContent } from '../content/index';

interface ITarget {
  readonly label: string;
  readonly actual: number;
  /** The floor. `actual` below this is a miss; above it is fine. */
  readonly expected: number;
}

const { issues, counts } = readContent();

function out(line: string): void {
  process.stdout.write(`${line}\n`);
}

const targets: readonly ITarget[] = [
  { label: 'words', actual: counts.words, expected: 3000 },
  { label: 'sentence items', actual: counts.sentenceItems, expected: 560 },
  { label: 'phonemes', actual: counts.phonemes, expected: 44 },
  { label: 'rule families', actual: counts.ruleFamilies, expected: 24 },
  { label: 'programme days', actual: counts.days, expected: 28 },
];

out('');
out('content totals');

for (const target of targets) {
  const mark = target.actual >= target.expected ? 'ok  ' : 'MISS';

  out(
    `  ${mark} ${target.label.padEnd(15)} ${String(target.actual).padStart(5)} / ${String(target.expected)}`,
  );
}

out('');
out('per week');

for (const week of WEEKS) {
  const minutes = week.days.map((day) => day.estimatedMinutes);
  const low = minutes.length === 0 ? 0 : Math.min(...minutes);
  const high = minutes.length === 0 ? 0 : Math.max(...minutes);

  out(
    `  week ${String(week.weekIndex)}   ${String(week.words.length).padStart(4)} words  ${String(week.sentenceItems.length).padStart(4)} sentences  ${String(week.days.length)} days  ${String(low)}–${String(high)} min/day`,
  );
}

/**
 * Which rule families the corpus actually exercises.
 *
 * A family nobody's content demonstrates is a row in the mastery matrix that
 * can never move, and a learner staring at a permanently empty cell.
 */
const exercised = new Set(
  WEEKS.flatMap((week) => [
    ...week.words.flatMap((word) => (word.ruleFamily === null ? [] : [word.ruleFamily])),
    ...week.sentenceItems.flatMap((item) => [...item.grammarRuleCodes]),
  ]),
);

const unexercised = RULE_FAMILIES.filter((family) => !exercised.has(family.code));

out('');
out(
  unexercised.length === 0
    ? `all ${String(RULE_FAMILIES.length)} rule families are exercised by the corpus`
    : `rule families with no content: ${unexercised.map((f) => f.code).join(', ')}`,
);

const absentFromBangla = PHONEMES.filter((phoneme) => phoneme.banglaEquivalent === null);

out(
  `${String(absentFromBangla.length)} of ${String(PHONEMES.length)} phonemes are absent from Bangla, each with the substitution learners produce: ${absentFromBangla
    .map((phoneme) => phoneme.symbol)
    .join(' ')}`,
);

out('');

if (counts.ipaNeedsReview.length === 0) {
  out('no IPA flagged for review.');
} else {
  out(
    `IPA flagged for review — ${String(counts.ipaNeedsReview.length)} of ${String(counts.words)}. **These are best attempts, not checked fact.**`,
  );
  out('They are the compressed -ary/-ory/-ery family and the words whose careful');
  out('and casual pronunciations differ by a syllable. A human should confirm which');
  out('register the course teaches before these are treated as settled.');
  out('');

  for (const entry of counts.ipaNeedsReview) {
    out(`  ${entry}`);
  }
}

out('');

if (issues.length > 0 || targets.some((target) => target.actual < target.expected)) {
  out('content is NOT complete.');
  process.exit(1);
}

out('content is complete and valid.');
