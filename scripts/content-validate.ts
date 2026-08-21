/**
 * `pnpm content:validate` — and, through `prebuild`, part of `pnpm build`.
 *
 * Prints every issue with its file and path, then the counts. Exits non-zero on
 * the first issue, which is what makes "a malformed entry fails the build" a
 * fact rather than an intention.
 */
import { validateGrammar } from '../content/grammar/index';
import { readContent } from '../content/index';
import { validateWordFamilies } from '../content/word-families/index';

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

/**
 * The IELTS word families, validated here for the same reason the grammar
 * course is: it is content and it fails the build like everything else, but it
 * shares no field, no cross-reference and no seed path with the 28-day corpus.
 * The one number worth printing beside the others is the word count, because
 * the product states it on a screen.
 */
const families = validateWordFamilies();

for (const issue of [...issues, ...grammar.issues, ...families.issues]) {
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
    `  word families   ${String(families.counts.families)}`,
    `  family words    ${String(families.counts.words)}`,
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

const total = issues.length + grammar.issues.length + families.issues.length;

if (total > 0) {
  process.stdout.write(`${String(total)} issue(s). Content is not valid.\n`);
  process.exit(1);
}

process.stdout.write('content is valid.\n');
