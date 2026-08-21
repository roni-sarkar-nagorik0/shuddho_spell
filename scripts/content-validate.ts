/**
 * `pnpm content:validate` — and, through `prebuild`, part of `pnpm build`.
 *
 * Prints every issue with its file and path, then the counts. Exits non-zero on
 * the first issue, which is what makes "a malformed entry fails the build" a
 * fact rather than an intention.
 */
import { validateGrammar } from '../content/grammar/index';
import { readContent } from '../content/index';

const { issues, counts } = readContent();

/**
 * The grammar course is validated here rather than inside `readContent`.
 *
 * It is content, and it fails the build like everything else in `content/` —
 * but it shares no field with the spelling corpus, no cross-reference and no
 * seed path. Folding it into `IContentCounts` would widen a type six callers
 * read so that one of them could print two extra numbers.
 */
const grammar = validateGrammar();

for (const issue of [...issues, ...grammar.issues]) {
  process.stdout.write(`${issue.file}  ${issue.path}\n    ${issue.message}\n`);
}

process.stdout.write(
  [
    '',
    'content counts',
    `  words           ${String(counts.words)}`,
    `  sentence items  ${String(counts.sentenceItems)}`,
    `  phonemes        ${String(counts.phonemes)}`,
    `  rule families   ${String(counts.ruleFamilies)}`,
    `  programme days  ${String(counts.days)}`,
    `  exams           ${String(counts.exams)}`,
    `  grammar days    ${String(grammar.counts.days)}`,
    `  grammar checks  ${String(grammar.counts.checks)}`,
    '',
  ].join('\n'),
);

if (counts.ipaNeedsReview.length > 0) {
  process.stdout.write(
    `IPA flagged for review (${String(counts.ipaNeedsReview.length)}) — nothing here is presented as checked fact:\n`,
  );

  for (const entry of counts.ipaNeedsReview) {
    process.stdout.write(`  ${entry}\n`);
  }

  process.stdout.write('\n');
}

if (counts.phonemesNeedReview.length > 0) {
  process.stdout.write(`phonemes flagged for review: ${counts.phonemesNeedReview.join(', ')}\n\n`);
}

const total = issues.length + grammar.issues.length;

if (total > 0) {
  process.stdout.write(`${String(total)} issue(s). Content is not valid.\n`);
  process.exit(1);
}

process.stdout.write('content is valid.\n');
