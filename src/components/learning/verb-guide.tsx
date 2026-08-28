import { type ReactElement } from 'react';
import { cn } from '@/lib/cn';

/**
 * The three tables that make the verb reference teachable rather than lookable.
 *
 * **Why this is literal content in a component and not in `content/`.** The
 * four corpora in `content/` are there because they are large, they are
 * checked by the build, and they change. These three tables are twelve tenses,
 * nine spelling rules and eight mistakes: they are the size of a page of
 * writing, nothing can drift out of step with them, and putting them behind a
 * port, a source, a use case and a DTO would be four files of ceremony to reach
 * the same twelve rows. `src/app/syllabus.ts` on the landing page is the same
 * decision.
 *
 * **They are the whole "how does this work" answer.** A learner who has never
 * met V1–V5 needs to be told what they are before a drill means anything, and
 * needs to be told *which tense uses which* before the forms have a purpose.
 * The drill is the practice; this is the thing being practised.
 *
 * A Server Component — no state, no handlers, and no reason to ship it.
 */

interface IFormExplainer {
  readonly key: string;
  readonly name: string;
  readonly what: string;
  readonly example: string;
}

/** V1 to V5, in one line each. The first thing on the page for a reason. */
export const FORM_EXPLAINERS: readonly IFormExplainer[] = [
  { key: 'V1', name: 'base form', what: 'The dictionary form.', example: 'go, eat, write' },
  { key: 'V2', name: 'past simple', what: 'Finished, in the past.', example: 'went, ate, wrote' },
  {
    key: 'V3',
    name: 'past participle',
    what: 'After have / has / had, and in the passive.',
    example: 'gone, eaten, written',
  },
  {
    key: 'V4',
    name: 'the -ing form',
    what: 'After am / is / are / was / were.',
    example: 'going, eating, writing',
  },
  {
    key: 'V5',
    name: 'he / she / it',
    what: 'Present simple, third person.',
    example: 'goes, eats, writes',
  },
];

/*
 * `ITenseFormula`, not `ITenseRow`. `src/lib/db/rows.test.ts` reserves the
 * `I…Row` name for hand-written database row interfaces and fails the build on
 * one declared anywhere but `infrastructure/rows/` — a guardrail worth keeping
 * sharp, so a table row in a component takes a different name rather than
 * blunting it.
 */
interface ITenseFormula {
  readonly tense: string;
  readonly formula: string;
  readonly example: string;
}

/** The twelve tenses, and which form each one takes. */
export const TENSES: readonly ITenseFormula[] = [
  { tense: 'Present simple', formula: 'V1 / V5', example: 'She walks.' },
  { tense: 'Present continuous', formula: 'am / is / are + V4', example: 'She is walking.' },
  { tense: 'Present perfect', formula: 'have / has + V3', example: 'She has walked.' },
  {
    tense: 'Present perfect continuous',
    formula: 'have / has been + V4',
    example: 'She has been walking.',
  },
  { tense: 'Past simple', formula: 'V2', example: 'She walked.' },
  { tense: 'Past continuous', formula: 'was / were + V4', example: 'She was walking.' },
  { tense: 'Past perfect', formula: 'had + V3', example: 'She had walked.' },
  { tense: 'Past perfect continuous', formula: 'had been + V4', example: 'She had been walking.' },
  { tense: 'Future simple', formula: 'will + V1', example: 'She will walk.' },
  { tense: 'Future continuous', formula: 'will be + V4', example: 'She will be walking.' },
  { tense: 'Future perfect', formula: 'will have + V3', example: 'She will have walked.' },
  {
    tense: 'Future perfect continuous',
    formula: 'will have been + V4',
    example: 'She will have been walking.',
  },
];

interface ISpellingRule {
  readonly ending: string;
  readonly when: string;
  readonly rule: string;
  readonly example: string;
}

/**
 * The nine rules, written as the same rules the app applies.
 *
 * These are not a separate account of English — they are `VerbConjugator` in
 * words, and the corpus is validated against that code. So a learner reading
 * this table and a learner reading a verb's row are being told the same thing
 * by construction, and the 35 exceptions the rules cannot reach are marked
 * `irregular` on the row rather than quietly contradicting this table.
 */
export const SPELLING_RULES: readonly ISpellingRule[] = [
  { ending: '-ed', when: 'Most verbs', rule: 'Add -ed.', example: 'work → worked' },
  { ending: '-ed', when: 'Ends in -e', rule: 'Add -d only.', example: 'live → lived' },
  {
    ending: '-ed',
    when: 'Consonant + y',
    rule: 'The y becomes an i.',
    example: 'try → tried',
  },
  {
    ending: '-ed',
    when: 'One syllable, consonant–vowel–consonant',
    rule: 'The last letter doubles.',
    example: 'stop → stopped',
  },
  { ending: '-ing', when: 'Most verbs', rule: 'Add -ing.', example: 'play → playing' },
  { ending: '-ing', when: 'Ends in -e', rule: 'The e goes.', example: 'make → making' },
  { ending: '-ing', when: 'Ends in -ie', rule: 'The -ie becomes a y.', example: 'die → dying' },
  {
    ending: '-s',
    when: 'Ends in -s, -sh, -ch, -x, -z, or consonant + o',
    rule: 'Add -es.',
    example: 'watch → watches',
  },
  { ending: '-s', when: 'Consonant + y', rule: 'The y becomes an i.', example: 'fly → flies' },
];

interface IMistake {
  readonly wrong: string;
  readonly right: string;
  readonly why: string;
}

/** Eight mistakes, and the one-line reason each is a mistake. */
export const MISTAKES: readonly IMistake[] = [
  { wrong: 'I have went to school.', right: 'I have gone to school.', why: 'have takes V3, not V2.' },
  { wrong: 'She don’t like it.', right: 'She doesn’t like it.', why: 'he / she / it takes does.' },
  { wrong: 'He taked the bus.', right: 'He took the bus.', why: 'take is irregular — V2 is took.' },
  { wrong: 'I am agree.', right: 'I agree.', why: 'agree is a verb already; it needs no am.' },
  {
    wrong: 'She is speaks English.',
    right: 'She speaks English.',
    why: 'One tense at a time — is + V4, or V5 alone.',
  },
  {
    wrong: 'They have ate dinner.',
    right: 'They have eaten dinner.',
    why: 'V3 is eaten. ate is V2.',
  },
  { wrong: 'He cutted the paper.', right: 'He cut the paper.', why: 'cut never changes.' },
  {
    wrong: 'The letter was wrote by Tom.',
    right: 'The letter was written by Tom.',
    why: 'The passive takes V3.',
  },
];

function Table({
  caption,
  headings,
  children,
}: {
  readonly caption: string;
  readonly headings: readonly string[];
  readonly children: ReactElement | readonly ReactElement[];
}): ReactElement {
  return (
    <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headings.map((heading) => (
              <th className="label h-8 border-b border-hairline px-3" key={heading}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** V1–V5, explained once, in five rows. */
export function FormKey({ className }: { readonly className?: string }): ReactElement {
  return (
    <ul className={cn('grid gap-2 sm:grid-cols-5', className)}>
      {FORM_EXPLAINERS.map((form) => (
        <li className="card p-3" key={form.key}>
          <p className="num text-primary-900">{form.key}</p>
          <p className="font-medium text-primary-900">{form.name}</p>
          <p className="mt-1 text-muted">{form.what}</p>
          <p className="mt-1 font-mono text-muted">{form.example}</p>
        </li>
      ))}
    </ul>
  );
}

export function TenseChart(): ReactElement {
  return (
    <Table
      caption="Which verb form each English tense takes, with an example"
      headings={['Tense', 'Formula', 'Example']}
    >
      {TENSES.map((row) => (
        <tr className="border-b border-hairline last:border-b-0" key={row.tense}>
          <td className="h-8 px-3 text-primary-900">{row.tense}</td>
          <td className="h-8 px-3 font-mono text-muted">{row.formula}</td>
          <td className="h-8 px-3 text-muted">{row.example}</td>
        </tr>
      ))}
    </Table>
  );
}

export function SpellingRules(): ReactElement {
  return (
    <Table
      caption="How to spell the -ed, -ing and -s forms"
      headings={['Ending', 'When', 'What happens', 'Example']}
    >
      {SPELLING_RULES.map((row) => (
        <tr className="border-b border-hairline last:border-b-0" key={`${row.ending}${row.when}`}>
          <td className="num h-8 px-3 text-primary-900">{row.ending}</td>
          <td className="px-3 py-2 text-muted">{row.when}</td>
          <td className="px-3 py-2 text-muted">{row.rule}</td>
          <td className="h-8 px-3 font-mono text-mastered">{row.example}</td>
        </tr>
      ))}
    </Table>
  );
}

export function CommonMistakes(): ReactElement {
  return (
    <Table
      caption="Eight common verb-form mistakes and their corrections"
      headings={['Written', 'Meant', 'Why']}
    >
      {MISTAKES.map((row) => (
        <tr className="border-b border-hairline last:border-b-0" key={row.wrong}>
          <td className="px-3 py-2 font-mono text-tertiary-700">{row.wrong}</td>
          <td className="px-3 py-2 font-mono text-mastered">{row.right}</td>
          <td className="px-3 py-2 text-muted">{row.why}</td>
        </tr>
      ))}
    </Table>
  );
}
