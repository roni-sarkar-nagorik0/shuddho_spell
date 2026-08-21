import { GRAMMAR_DAYS } from '../../../../../../content/grammar/index';
import { usesWord, wordCount } from '@/modules/shared/domain/text/words-in';
import {
  type IGrammarExample,
  type IGrammarExampleSource,
} from '../../../domain/repositories/grammar-example-source';

/**
 * The shortest an example may be before it stops being a demonstration.
 *
 * Below five words it is not longer than what `sentence_items` already offers,
 * which is the entire reason this source exists.
 */
const SHORTEST = 5;

/**
 * Grammar-lesson examples, read from the compiled content module.
 *
 * The same pattern `modules/grammar`'s own lesson repository uses — content
 * that is prose rather than data is a module, not a table, so the adapter for
 * it imports `content/` directly and there is no query.
 *
 * **Only `sections[].examples[]`.** A lesson also carries `mistakes[]`, and
 * `mistakes[].wrong` is *deliberately incorrect English* — "I am agree" is
 * there to be named and corrected. Putting one of those under a heading that
 * says "in a sentence" would be the worst thing this page could do. The pairs
 * are excluded whole rather than half, so no future edit can promote a `wrong`
 * into scope by renaming a field.
 *
 * Collected once at construction. The content cannot change while the process
 * is running, and rebuilding 313 strings per demo word would be work done to
 * reach the same answer.
 */
export class GrammarContentExampleSource implements IGrammarExampleSource {
  private readonly examples: readonly IGrammarExample[] = collect();

  findUsing(word: string): Promise<readonly IGrammarExample[]> {
    return Promise.resolve(this.examples.filter((example) => usesWord(example.english, word)));
  }
}

function collect(): readonly IGrammarExample[] {
  const collected: IGrammarExample[] = [];

  for (const day of GRAMMAR_DAYS) {
    for (const [sectionIndex, section] of day.sections.entries()) {
      for (const [exampleIndex, example] of section.examples.entries()) {
        const english = example.english.trim();

        if (!isOneWholeSentence(english)) {
          continue;
        }

        collected.push({
          id: `day-${String(day.dayIndex)}-${String(sectionIndex)}-${String(exampleIndex)}`,
          english,
          note: example.note ?? null,
          dayIndex: day.dayIndex,
        });
      }
    }
  }

  return collected;
}

/**
 * Whether this entry is a sentence rather than a fragment or a list.
 *
 * The examples are authored to demonstrate a rule, and some of them demonstrate
 * it with a list — `an MBA, an X-ray, a one-way street` — or with a pair of
 * sentences where the second is the interesting one. Both read as broken under
 * a heading promising the word in use, so both are refused: terminal
 * punctuation, once, at the end.
 */
function isOneWholeSentence(text: string): boolean {
  return (
    /[.!?]$/u.test(text) &&
    text.split(/[.!?]/u).filter((part) => part.trim() !== '').length === 1 &&
    wordCount(text) >= SHORTEST
  );
}
