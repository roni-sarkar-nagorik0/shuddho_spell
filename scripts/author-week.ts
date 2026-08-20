/**
 * Turns a compact authoring table into `content/week-0N.ts`.
 *
 * The content is authored one line per entry — pipe-separated — because the TS
 * object form is ten lines per word and 310 words a week, and a review that has
 * to scroll past 3,000 lines of punctuation is a review nobody does. The
 * generated file is still the committed source of truth; this is a way of
 * writing it, not a second place it lives.
 *
 *   node scripts/author-week.mjs <week> <words.txt> <sentences.txt>
 *
 * words:     text|ipa|syl-syl|banglaSound|banglaMeaning|pos|ruleFamily|rank|miss,miss[,miss][|review]
 * sentences: bangla|english|alt;alt|distractor,distractor|rule,rule|difficulty
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { z } from 'zod';

/**
 * The per-week prose and day titles, validated like everything else: a typo in
 * a meta file would otherwise become `undefined` in a generated day title and
 * be noticed by a learner rather than by the build.
 */
const weekMetaSchema = z.object({
  doc: z.string(),
  days: z.array(z.object({ title: z.string(), focus: z.string() })),
});

interface IAuthoredWord {
  readonly text: string;
  readonly ipa: string;
  readonly syllables: readonly string[];
  readonly banglaSound: string;
  readonly banglaMeaning: string;
  readonly partOfSpeech: string;
  readonly ruleFamily: string | null;
  readonly frequencyRank: number | null;
  readonly commonMisspellings: readonly string[];
  readonly ipaNeedsReview: boolean;
}

interface IAuthoredSentence {
  readonly banglaText: string;
  readonly englishText: string;
  readonly acceptedAlternatives: readonly string[];
  readonly distractorWords: readonly string[];
  readonly grammarRuleCodes: readonly string[];
  readonly difficulty: string;
}

interface IDayMeta {
  readonly title: string;
  readonly focus: string;
}

interface IWeekMeta {
  readonly doc: string;
  readonly days: readonly IDayMeta[];
}

const week = Number(process.argv[2]);
const wordsFile = process.argv[3] ?? '';
const sentencesFile = process.argv[4] ?? '';

const SECONDS_PER_WORD = 25;
const SECONDS_PER_SENTENCE = 45;
const DAYS_PER_WEEK = 7;

const quote = (value: string): string =>
  `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

const list = (values: readonly string[]): string => `[${values.map(quote).join(', ')}]`;

function readLines(file: string): readonly string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

const words: readonly IAuthoredWord[] = readLines(wordsFile).map((line): IAuthoredWord => {
  const field = line.split('|');
  const at = (index: number): string => field[index] ?? '';

  return {
    text: at(0),
    ipa: at(1),
    syllables: at(2).split('-'),
    banglaSound: at(3),
    banglaMeaning: at(4),
    partOfSpeech: at(5),
    ruleFamily: at(6) === '' ? null : at(6),
    frequencyRank: at(7) === '' ? null : Number(at(7)),
    commonMisspellings: at(8).split(','),
    ipaNeedsReview: at(9) === 'review',
  };
});

const sentences: readonly IAuthoredSentence[] = readLines(sentencesFile).map(
  (line): IAuthoredSentence => {
    const field = line.split('|');
    const at = (index: number): string => field[index] ?? '';

    return {
      banglaText: at(0),
      englishText: at(1),
      acceptedAlternatives: at(2).split(';'),
      distractorWords: at(3).split(','),
      grammarRuleCodes: at(4) === '' ? [] : at(4).split(','),
      difficulty: at(5),
    };
  },
);

/** High-frequency first within a day — `10-content-pipeline.md`'s ordering rule. */
const ordered = [...words].sort((a, b) => (a.frequencyRank ?? 1e9) - (b.frequencyRank ?? 1e9));

interface IDayPlan {
  readonly dayIndex: number;
  readonly wordTexts: readonly string[];
  readonly sentenceTexts: readonly string[];
  readonly ruleFamilyCodes: readonly string[];
  readonly estimatedMinutes: number;
}

const days: IDayPlan[] = [];
const firstDay = (week - 1) * DAYS_PER_WEEK + 1;

for (let offset = 0; offset < DAYS_PER_WEEK; offset += 1) {
  const dayWords = ordered.filter((_, index) => index % DAYS_PER_WEEK === offset);
  const daySentences = sentences.filter((_, index) => index % DAYS_PER_WEEK === offset);

  const minutes = Math.round(
    (dayWords.length * SECONDS_PER_WORD + daySentences.length * SECONDS_PER_SENTENCE) / 60,
  );

  days.push({
    dayIndex: firstDay + offset,
    wordTexts: dayWords.map((word) => word.text),
    sentenceTexts: daySentences.map((item) => item.englishText),
    ruleFamilyCodes: [
      ...new Set([
        ...dayWords.flatMap((word) => (word.ruleFamily === null ? [] : [word.ruleFamily])),
        ...daySentences.flatMap((item) => item.grammarRuleCodes),
      ]),
    ],
    estimatedMinutes: minutes,
  });
}

const meta: IWeekMeta = weekMetaSchema.parse(
  JSON.parse(readFileSync(`content/week-0${String(week)}.meta.json`, 'utf8')),
);

const body = `import { type WeekEntry } from './schema';

${meta.doc}
export const WEEK_0${String(week)}: WeekEntry = {
  weekIndex: ${String(week)},

  words: [
${words
  .map(
    (word) => `    {
      text: ${quote(word.text)},
      ipa: ${quote(word.ipa)},
      syllables: ${list(word.syllables)},
      banglaSound: ${quote(word.banglaSound)},
      banglaMeaning: ${quote(word.banglaMeaning)},
      partOfSpeech: ${quote(word.partOfSpeech)},
      ruleFamily: ${word.ruleFamily === null ? 'null' : quote(word.ruleFamily)},
      frequencyRank: ${word.frequencyRank === null ? 'null' : String(word.frequencyRank)},
      commonMisspellings: ${list(word.commonMisspellings)},
      ipaNeedsReview: ${String(word.ipaNeedsReview)},
    },`,
  )
  .join('\n')}
  ],

  sentenceItems: [
${sentences
  .map(
    (item) => `    {
      banglaText: ${quote(item.banglaText)},
      englishText: ${quote(item.englishText)},
      acceptedAlternatives: ${list(item.acceptedAlternatives)},
      distractorWords: ${list(item.distractorWords)},
      grammarRuleCodes: ${list(item.grammarRuleCodes)},
      difficulty: ${quote(item.difficulty)},
    },`,
  )
  .join('\n')}
  ],

  days: [
${days
  .map(
    (day) => `    {
      dayIndex: ${String(day.dayIndex)},
      title: ${quote(meta.days[day.dayIndex - firstDay]?.title ?? '')},
      focus: ${quote(meta.days[day.dayIndex - firstDay]?.focus ?? '')},
      wordTexts: ${list(day.wordTexts)},
      sentenceTexts: ${list(day.sentenceTexts)},
      ruleFamilyCodes: ${list(day.ruleFamilyCodes)},
      estimatedMinutes: ${String(day.estimatedMinutes)},
    },`,
  )
  .join('\n')}
  ],
};
`;

writeFileSync(`content/week-0${String(week)}.ts`, body);

process.stdout.write(
  `week ${String(week)}: ${String(words.length)} words, ${String(sentences.length)} sentences, ${String(days.length)} days\n`,
);
