/**
 * `pnpm content:validate` — and, through `prebuild`, part of `pnpm build`.
 *
 * Prints every issue with its file and path, then the counts. Exits non-zero on
 * the first issue, which is what makes "a malformed entry fails the build" a
 * fact rather than an intention.
 */
import { readContent } from '../content/index';

const { issues, counts } = readContent();

for (const issue of issues) {
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
  process.stdout.write(
    `phonemes flagged for review: ${counts.phonemesNeedReview.join(', ')}\n\n`,
  );
}

if (issues.length > 0) {
  process.stdout.write(`${String(issues.length)} issue(s). Content is not valid.\n`);
  process.exit(1);
}

process.stdout.write('content is valid.\n');
