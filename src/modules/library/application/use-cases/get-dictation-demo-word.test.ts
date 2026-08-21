/**
 * The demo's word, and the sentence that now comes with it.
 *
 * Two of these claims are the reason the sentence feature exists at all rather
 * than being a `find` beside the query, and both compile when wrong:
 *
 * - **`handle` is not an example of `hand`.** The database can only be asked
 *   for `ilike '%hand%'`, so the substring matches come back and something has
 *   to throw them away. If that check is ever lost, the panel keeps working and
 *   simply teaches the wrong word — the worst kind of regression, because
 *   nothing fails.
 * - **The probe is issued at once, not in turn.** Five sequential round trips
 *   on a marketing page would undo the landing-page work this repository
 *   already did; the test counts the overlap rather than trusting the shape of
 *   the code.
 *
 * And the one that matters most for a visitor: a word with no sentence anywhere
 * in the corpus still yields a word. The feature degrades to what was there
 * before rather than to an empty panel.
 */
import { describe, expect, it } from 'vitest';
import { type IRandomSource } from '@/modules/shared/application/ports/random';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { SentenceItem } from '../../domain/entities/sentence-item';
import { type ISentenceItemRepository } from '../../domain/repositories/sentence-item-repository';
import { Word } from '../../domain/entities/word';
import { type IWordRepository } from '../../domain/repositories/word-repository';
import { GetDictationDemoWordUseCase } from './get-dictation-demo-word';

function word(text: string): Word {
  return new Word(
    `w-${text}`,
    text,
    IpaTranscription.of('hænd'),
    [text],
    'হ্যান্ড',
    'হাত',
    'noun',
    null,
    1,
    null,
    [`${text}e`],
  );
}

function sentence(english: string): SentenceItem {
  return new SentenceItem(`s-${english}`, 'বাংলা বাক্য।', english, [], [], [], 'easy');
}

/**
 * A random source that walks a script and then repeats its last answer.
 *
 * `below` is called for the week, then once per candidate as the sample draws
 * from a shrinking pool — a fixed sequence is the only way to say "pick these
 * five words, in this order" and have the assertion mean anything.
 */
function scripted(values: readonly number[]): IRandomSource {
  let index = 0;

  return {
    below: (size) => {
      const value = values[index] ?? 0;
      index += 1;

      return size <= 0 ? 0 : value % size;
    },
  };
}

function build(options: {
  readonly pool: readonly Word[];
  readonly sentences: Readonly<Record<string, readonly SentenceItem[]>>;
  readonly random?: IRandomSource;
  readonly onProbe?: (word: string) => void;
}): GetDictationDemoWordUseCase {
  const words: IWordRepository = {
    findById: () => Promise.resolve(null),
    findByIds: () => Promise.resolve([]),
    findUpToWeek: () => Promise.resolve([]),
    search: () => Promise.resolve(options.pool),
  };

  const sentences: ISentenceItemRepository = {
    findById: () => Promise.reject(new Error('the demo never reads a sentence by id')),
    findByIds: () => Promise.reject(new Error('the demo never reads a sentence by id')),
    listAll: () => Promise.reject(new Error('the demo must not pull the whole table')),
    findContaining: (text) => {
      options.onProbe?.(text);

      return Promise.resolve(options.sentences[text] ?? []);
    },
  };

  return new GetDictationDemoWordUseCase(words, options.random ?? scripted([0]), sentences);
}

describe('the landing page demo word', () => {
  it('returns null when the corpus is not seeded', async () => {
    await expect(build({ pool: [], sentences: {} }).execute()).resolves.toBeNull();
  });

  it('carries the sentence that uses the word', async () => {
    const result = await build({
      pool: [word('hand')],
      sentences: { hand: [sentence('The book is in my hand.')] },
    }).execute();

    expect(result?.text).toBe('hand');
    expect(result?.sentence?.english).toBe('The book is in my hand.');
    expect(result?.sentence?.bangla).toBe('বাংলা বাক্য।');
  });

  it('refuses a sentence that only contains the word inside a longer one', async () => {
    // What the database answers `ilike '%hand%'` with. Every one of these is a
    // different word, and none of them is an example of `hand`.
    const result = await build({
      pool: [word('hand')],
      sentences: {
        hand: [
          sentence('She turned the handle.'),
          sentence('He knew it beforehand.'),
          sentence('I can write shorthand.'),
        ],
      },
    }).execute();

    expect(result?.text).toBe('hand');
    expect(result?.sentence).toBeNull();
  });

  it('still gives a word when nothing in the corpus uses it', async () => {
    const result = await build({ pool: [word('although')], sentences: {} }).execute();

    expect(result?.text).toBe('although');
    expect(result?.sentence).toBeNull();
  });

  it('prefers a candidate the corpus has a sentence for', async () => {
    // The pool's first pick is `although`, which no sentence uses. The probe
    // reaches `hand` and that is what the visitor is shown — the bias the DTO
    // documents, made visible.
    const result = await build({
      pool: [word('although'), word('hand')],
      sentences: { hand: [sentence('Give me your hand.')] },
      random: scripted([0, 0, 0]),
    }).execute();

    expect(result?.text).toBe('hand');
    expect(result?.sentence?.english).toBe('Give me your hand.');
  });

  it('probes distinct candidates rather than the same word five times', async () => {
    const probed: string[] = [];

    await build({
      pool: ['one', 'two', 'three', 'four', 'five', 'six'].map(word),
      sentences: {},
      onProbe: (text) => probed.push(text),
    }).execute();

    expect(probed).toHaveLength(5);
    expect(new Set(probed).size).toBe(5);
  });

  it('probes fewer times than that when the pool is smaller', async () => {
    const probed: string[] = [];

    await build({
      pool: [word('hand'), word('foot')],
      sentences: {},
      onProbe: (text) => probed.push(text),
    }).execute();

    expect(probed).toHaveLength(2);
  });

  /**
   * The latency claim, asserted rather than assumed.
   *
   * Each probe records when it started and when it was allowed to finish. If
   * the use case awaited them one at a time, no two windows would overlap. The
   * deferred resolution is what makes the difference observable — a synchronous
   * fake would pass either way.
   */
  it('issues the probes together, not one after another', async () => {
    const started: string[] = [];
    const release: (() => void)[] = [];

    const words: IWordRepository = {
      findById: () => Promise.resolve(null),
      findByIds: () => Promise.resolve([]),
      findUpToWeek: () => Promise.resolve([]),
      // Three letters at the shortest: `isDemonstrable` drops anything below
      // that, and a pool that filters to nothing never reaches the probe.
      search: () => Promise.resolve(['alpha', 'bravo', 'delta', 'echo', 'gamma'].map(word)),
    };

    const sentences: ISentenceItemRepository = {
      findById: () => Promise.reject(new Error('not used')),
      findByIds: () => Promise.reject(new Error('not used')),
      listAll: () => Promise.reject(new Error('not used')),
      findContaining: (text) => {
        started.push(text);

        return new Promise((resolve) => {
          release.push(() => { resolve([]); });
        });
      },
    };

    const running = new GetDictationDemoWordUseCase(words, scripted([0]), sentences).execute();

    // A full turn of the event loop, so the pool read and the probes that
    // follow it have all had their chance to start. Nothing has been released:
    // sequential code would be sitting on the first probe with one entry here,
    // parallel code has all five in flight.
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    expect(started).toHaveLength(5);

    for (const resolve of release) {
      resolve();
    }

    await expect(running).resolves.not.toBeNull();
  });
});
