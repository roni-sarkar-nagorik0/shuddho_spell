/**
 * The grammar examples, and the three kinds of entry that must never reach the
 * landing page.
 *
 * The dangerous one is `mistakes[].wrong`. A lesson carries "I am agree" on
 * purpose — it is there to be named and corrected — and it is a grammatical
 * English-looking sentence that would render perfectly under a heading saying
 * *In a sentence*. Nothing would fail. A visitor would simply be shown broken
 * English by a product selling English precision, and the only thing standing
 * between those two facts is that this adapter reads `sections` and not
 * `mistakes`.
 *
 * The other two are quieter: a fragment (`an MBA, an X-ray, a one-way street`)
 * and a two-sentence entry, both of which read as a bug rather than an example.
 *
 * These run against the **real content**, not a fixture. A fixture would prove
 * the filter works on strings somebody wrote to make it work.
 */
import { describe, expect, it } from 'vitest';
import { GRAMMAR_DAYS } from '../../../../../../content/grammar/index';
import { wordCount } from '@/modules/shared/domain/text/words-in';
import { GrammarContentExampleSource } from './grammar-example.source';

const source = new GrammarContentExampleSource();

/** Every example the adapter will ever hand out, gathered through the port. */
async function everything(): Promise<readonly string[]> {
  const words = new Set<string>();

  for (const day of GRAMMAR_DAYS) {
    for (const section of day.sections) {
      for (const example of section.examples) {
        for (const token of example.english.toLowerCase().split(/[^a-z']+/u)) {
          if (token !== '') {
            words.add(token);
          }
        }
      }
    }
  }

  const found = await Promise.all([...words].map(async (word) => source.findUsing(word)));

  return [...new Set(found.flat().map((example) => example.english))];
}

describe('the grammar example source', () => {
  it('finds a word in a lesson example', async () => {
    const found = await source.findUsing('sentence');

    expect(found.length).toBeGreaterThan(0);
    expect(found.every((example) => example.english.toLowerCase().includes('sentence'))).toBe(true);
  });

  it('matches whole words only', async () => {
    // A compiled module can do what `ilike` cannot, and the port promises it.
    const found = await source.findUsing('sentenc');

    expect(found).toEqual([]);
  });

  it('never hands out a sentence a lesson marked as wrong', async () => {
    const wrong = new Set(
      GRAMMAR_DAYS.flatMap((day) => day.mistakes.map((mistake) => mistake.wrong.trim())),
    );

    expect(wrong.size).toBeGreaterThan(50);

    const offenders = (await everything()).filter((english) => wrong.has(english));

    expect(offenders, 'these are deliberately incorrect English').toEqual([]);
  });

  it('hands out whole sentences, never fragments or pairs', async () => {
    const all = await everything();

    expect(all.length).toBeGreaterThan(200);

    for (const english of all) {
      expect(english, 'must end in terminal punctuation').toMatch(/[.!?]$/u);
      expect(
        english.split(/[.!?]/u).filter((part) => part.trim() !== ''),
        'must be exactly one sentence',
      ).toHaveLength(1);
      expect(wordCount(english)).toBeGreaterThanOrEqual(5);
    }
  });

  it('is longer than the corpus it supplements, which is the point', async () => {
    const all = await everything();
    const lengths = all.map(wordCount).sort((a, b) => a - b);
    const median = lengths[Math.floor(lengths.length / 2)] ?? 0;

    // `sentence_items` runs to four words at the median. If this source ever
    // stops beating that, it is costing a Bangla line for nothing.
    expect(median).toBeGreaterThan(4);
  });

  it('carries the lesson’s note where the entry has one', async () => {
    const all = await Promise.all(
      GRAMMAR_DAYS.flatMap((day) =>
        day.sections.flatMap((section) =>
          section.examples.map(async (example) => source.findUsing(example.english.split(' ')[0] ?? '')),
        ),
      ),
    );

    expect(all.flat().flat().some((example) => example.note !== null)).toBe(true);
  });
});
