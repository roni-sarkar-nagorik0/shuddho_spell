/**
 * `pnpm content:seed` — validate, diff, apply only what changed.
 *
 *   pnpm content:seed            apply
 *   pnpm content:seed --dry-run  show the diff and connect to nothing
 *
 * `10-content-pipeline.md` asks for exactly this shape, and the reason is in
 * the middle step: **diffing is what makes content editable after launch
 * without a migration and without wiping learner progress.** A seed that
 * truncated and reinserted would give every word a new uuid, and every
 * `review_items.item_id`, `attempts.item_id` and `mastery_records.dimension_id`
 * pointing at the old one would be orphaned — months of a learner's history,
 * silently detached, by a command whose name suggests it is safe to re-run.
 *
 * So nothing is ever deleted here and nothing is reinserted. Rows are matched
 * on their **natural keys** — a phoneme's symbol, a rule family's code, a
 * word's text, a sentence's English target — and only rows whose content
 * actually differs are updated.
 *
 * Like the migration runner, this never reads an env file itself:
 * `node --env-file-if-exists` hands it `DATABASE_URL`, and the value is never
 * printed.
 */
import process from 'node:process';
import pg from 'pg';
import { PHONEMES, RULE_FAMILIES, WEEKS, readContent } from '../content/index';
import { type SentenceItemEntry, type WordEntry } from '../content/schema';

const DRY_RUN = process.argv.includes('--dry-run');

interface IPlan {
  readonly table: string;
  readonly inserts: number;
  readonly updates: number;
  readonly unchanged: number;
}

function out(line: string): void {
  process.stdout.write(`${line}\n`);
}

/**
 * The corpus, flattened and tagged with the week each word belongs to.
 *
 * `week_index` is a column on `words`, so it has to travel with the row; the
 * week files are the only place that information exists.
 */
function allWords(): readonly (WordEntry & { readonly weekIndex: number })[] {
  return WEEKS.flatMap((week) => week.words.map((word) => ({ ...word, weekIndex: week.weekIndex })));
}

function allSentences(): readonly SentenceItemEntry[] {
  return WEEKS.flatMap((week) => week.sentenceItems);
}

/**
 * Whether two values differ, treating arrays as ordered lists.
 *
 * Ordered on purpose: `syllables` and `examples` are sequences a learner is
 * shown in order, and treating them as sets would call a reordered rule
 * unchanged when the lesson it produces is different.
 */
function differs(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) !== JSON.stringify(right ?? null);
}

async function seed(): Promise<void> {
  const { issues, counts } = readContent();

  // Validate first, always. Applying content that failed validation is how a
  // corpus ends up with a word nothing can render and no record of when it
  // arrived.
  if (issues.length > 0) {
    for (const issue of issues) {
      out(`${issue.file}  ${issue.path}\n    ${issue.message}`);
    }

    out(`\n${String(issues.length)} issue(s). Nothing was applied.`);
    process.exit(1);
  }

  out(
    `validated: ${String(counts.words)} words, ${String(counts.sentenceItems)} sentences, ${String(counts.phonemes)} phonemes, ${String(counts.ruleFamilies)} rule families`,
  );

  const connectionString = process.env['DATABASE_URL'];

  if (DRY_RUN) {
    out('\n--dry-run: validated only. Nothing was connected to and nothing applied.');

    return;
  }

  if (connectionString === undefined || connectionString.trim() === '') {
    out('\nDATABASE_URL is not set. Set it in .env.local, or use --dry-run to validate only.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

  await client.connect();

  try {
    const plans: IPlan[] = [];

    plans.push(await seedPhonemes(client));
    plans.push(await seedRuleFamilies(client));
    plans.push(await seedWords(client));
    plans.push(await seedSentences(client));

    out('');

    for (const plan of plans) {
      out(
        `${plan.table.padEnd(16)} +${String(plan.inserts)} inserted  ~${String(plan.updates)} updated  =${String(plan.unchanged)} unchanged`,
      );
    }

    const changed = plans.reduce((sum, plan) => sum + plan.inserts + plan.updates, 0);

    out(
      changed === 0
        ? '\nno changes — a second run is a no-op, which is the point'
        : `\n${String(changed)} row(s) changed. Nothing was deleted; learner history is untouched.`,
    );
  } finally {
    await client.end();
  }
}

async function seedPhonemes(client: pg.Client): Promise<IPlan> {
  const existing = await client.query<{
    symbol: string;
    type: string;
    bangla_equivalent: string | null;
    articulation_note: string;
    common_bengali_substitution: string | null;
  }>(
    'select symbol, type, bangla_equivalent, articulation_note, common_bengali_substitution from public.phonemes',
  );

  const bySymbol = new Map(existing.rows.map((row) => [row.symbol, row]));
  let inserts = 0;
  let updates = 0;
  let unchanged = 0;

  for (const phoneme of PHONEMES) {
    const row = bySymbol.get(phoneme.symbol);

    if (row === undefined) {
      await client.query(
        `insert into public.phonemes
           (symbol, type, bangla_equivalent, articulation_note, common_bengali_substitution)
         values ($1, $2, $3, $4, $5)`,
        [
          phoneme.symbol,
          phoneme.type,
          phoneme.banglaEquivalent,
          phoneme.articulationNote,
          phoneme.commonBengaliSubstitution,
        ],
      );

      inserts += 1;
      continue;
    }

    const changed =
      differs(row.type, phoneme.type) ||
      differs(row.bangla_equivalent, phoneme.banglaEquivalent) ||
      differs(row.articulation_note, phoneme.articulationNote) ||
      differs(row.common_bengali_substitution, phoneme.commonBengaliSubstitution);

    if (!changed) {
      unchanged += 1;
      continue;
    }

    await client.query(
      `update public.phonemes
          set type = $2, bangla_equivalent = $3, articulation_note = $4,
              common_bengali_substitution = $5, updated_at = now()
        where symbol = $1`,
      [
        phoneme.symbol,
        phoneme.type,
        phoneme.banglaEquivalent,
        phoneme.articulationNote,
        phoneme.commonBengaliSubstitution,
      ],
    );

    updates += 1;
  }

  return { table: 'phonemes', inserts, updates, unchanged };
}

async function seedRuleFamilies(client: pg.Client): Promise<IPlan> {
  const existing = await client.query<{
    code: string;
    statement: string;
    examples: string[];
    counterexamples: string[];
  }>('select code, statement, examples, counterexamples from public.rule_families');

  const byCode = new Map(existing.rows.map((row) => [row.code, row]));
  let inserts = 0;
  let updates = 0;
  let unchanged = 0;

  for (const family of RULE_FAMILIES) {
    const row = byCode.get(family.code);

    if (row === undefined) {
      await client.query(
        'insert into public.rule_families (code, statement, examples, counterexamples) values ($1, $2, $3, $4)',
        [family.code, family.statement, family.examples, family.counterexamples],
      );

      inserts += 1;
      continue;
    }

    if (
      !differs(row.statement, family.statement) &&
      !differs(row.examples, family.examples) &&
      !differs(row.counterexamples, family.counterexamples)
    ) {
      unchanged += 1;
      continue;
    }

    await client.query(
      'update public.rule_families set statement = $2, examples = $3, counterexamples = $4, updated_at = now() where code = $1',
      [family.code, family.statement, family.examples, family.counterexamples],
    );

    updates += 1;
  }

  return { table: 'rule_families', inserts, updates, unchanged };
}

async function seedWords(client: pg.Client): Promise<IPlan> {
  const families = await client.query<{ id: string; code: string }>(
    'select id, code from public.rule_families',
  );
  const familyId = new Map(families.rows.map((row) => [row.code, row.id]));

  const existing = await client.query<{
    text: string;
    ipa: string;
    syllables: string[];
    bangla_sound: string;
    bangla_meaning: string;
    part_of_speech: string;
    rule_family_id: string | null;
    week_index: number;
    frequency_rank: number | null;
    common_misspellings: string[];
  }>(
    `select text, ipa, syllables, bangla_sound, bangla_meaning, part_of_speech,
            rule_family_id, week_index, frequency_rank, common_misspellings
       from public.words`,
  );

  const byText = new Map(existing.rows.map((row) => [row.text, row]));
  let inserts = 0;
  let updates = 0;
  let unchanged = 0;

  for (const word of allWords()) {
    const ruleFamilyId = word.ruleFamily === null ? null : (familyId.get(word.ruleFamily) ?? null);
    const row = byText.get(word.text);

    const values = [
      word.text,
      word.ipa,
      word.syllables,
      word.banglaSound,
      word.banglaMeaning,
      word.partOfSpeech,
      ruleFamilyId,
      word.weekIndex,
      word.frequencyRank,
      word.commonMisspellings,
    ];

    if (row === undefined) {
      await client.query(
        `insert into public.words
           (text, ipa, syllables, bangla_sound, bangla_meaning, part_of_speech,
            rule_family_id, week_index, frequency_rank, common_misspellings)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        values,
      );

      inserts += 1;
      continue;
    }

    const changed =
      differs(row.ipa, word.ipa) ||
      differs(row.syllables, word.syllables) ||
      differs(row.bangla_sound, word.banglaSound) ||
      differs(row.bangla_meaning, word.banglaMeaning) ||
      differs(row.part_of_speech, word.partOfSpeech) ||
      differs(row.rule_family_id, ruleFamilyId) ||
      differs(row.week_index, word.weekIndex) ||
      differs(row.frequency_rank, word.frequencyRank) ||
      differs(row.common_misspellings, word.commonMisspellings);

    if (!changed) {
      unchanged += 1;
      continue;
    }

    await client.query(
      `update public.words
          set ipa = $2, syllables = $3, bangla_sound = $4, bangla_meaning = $5,
              part_of_speech = $6, rule_family_id = $7, week_index = $8,
              frequency_rank = $9, common_misspellings = $10, updated_at = now()
        where text = $1`,
      values,
    );

    updates += 1;
  }

  return { table: 'words', inserts, updates, unchanged };
}

async function seedSentences(client: pg.Client): Promise<IPlan> {
  const families = await client.query<{ id: string; code: string }>(
    'select id, code from public.rule_families',
  );
  const familyId = new Map(families.rows.map((row) => [row.code, row.id]));

  const existing = await client.query<{
    english_text: string;
    bangla_text: string;
    accepted_alternatives: string[];
    distractor_words: string[];
    grammar_rule_family_ids: string[];
    difficulty: string;
  }>(
    `select english_text, bangla_text, accepted_alternatives, distractor_words,
            grammar_rule_family_ids, difficulty
       from public.sentence_items`,
  );

  const byEnglish = new Map(existing.rows.map((row) => [row.english_text, row]));
  let inserts = 0;
  let updates = 0;
  let unchanged = 0;

  for (const item of allSentences()) {
    const ruleIds = item.grammarRuleCodes.flatMap((code) => {
      const id = familyId.get(code);

      return id === undefined ? [] : [id];
    });

    const row = byEnglish.get(item.englishText);

    const values = [
      item.englishText,
      item.banglaText,
      item.acceptedAlternatives,
      item.distractorWords,
      ruleIds,
      item.difficulty,
    ];

    if (row === undefined) {
      await client.query(
        `insert into public.sentence_items
           (english_text, bangla_text, accepted_alternatives, distractor_words,
            grammar_rule_family_ids, difficulty)
         values ($1, $2, $3, $4, $5, $6)`,
        values,
      );

      inserts += 1;
      continue;
    }

    const changed =
      differs(row.bangla_text, item.banglaText) ||
      differs(row.accepted_alternatives, item.acceptedAlternatives) ||
      differs(row.distractor_words, item.distractorWords) ||
      differs(row.grammar_rule_family_ids, ruleIds) ||
      differs(row.difficulty, item.difficulty);

    if (!changed) {
      unchanged += 1;
      continue;
    }

    await client.query(
      `update public.sentence_items
          set bangla_text = $2, accepted_alternatives = $3, distractor_words = $4,
              grammar_rule_family_ids = $5, difficulty = $6, updated_at = now()
        where english_text = $1`,
      values,
    );

    updates += 1;
  }

  return { table: 'sentence_items', inserts, updates, unchanged };
}

seed().catch((caught: unknown) => {
  out(caught instanceof Error ? caught.message : 'content seed failed');
  process.exit(1);
});
