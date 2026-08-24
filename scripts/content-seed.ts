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
import type pg from 'pg';
import {
  UNREACHABLE_HELP,
  connectDatabase,
  normaliseDatabaseUrl,
} from './lib/database-url.mjs';
import { EXAMS, PHONEMES, RULE_FAMILIES, WEEKS, readContent } from '../content/index';
import { type DayPlanEntry, type SentenceItemEntry, type WordEntry } from '../content/schema';

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * How many sprint days each week of content is spread across.
 *
 * The week files describe **one** track: 28 days, seven per week. The sprint is
 * the same four weeks in 21 days, and these five numbers are not a preference —
 * they are the only split that puts every exam where 004 says it unlocks:
 * `milestone1` on sprint day 5, `milestone2` on 11, `milestone3` on 16 and the
 * `final` on 21. Weeks of 5, 6, 5 and 5 land the end of each week of content
 * exactly on its milestone, and 5 + 6 + 5 + 5 is 21.
 *
 * `08-exam-engine.md` fixes the unlock days and the onboarding wizard fixes the
 * rest: it offers the sprint as "the same material, compressed — longer
 * sessions, less spacing". So nothing may be dropped. Twenty-eight days of
 * content across twenty-one means **seven sprint days carry two**, and those
 * are the longer sessions the learner was promised.
 */
const SPRINT_DAYS_PER_WEEK: readonly number[] = [5, 6, 5, 5];

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
  return WEEKS.flatMap((week) =>
    week.words.map((word) => ({ ...word, weekIndex: week.weekIndex })),
  );
}

function allSentences(): readonly SentenceItemEntry[] {
  return WEEKS.flatMap((week) => week.sentenceItems);
}

/** One row of `program_days`, with the names its items still have to resolve. */
interface IPlannedDay {
  readonly track: string;
  readonly dayIndex: number;
  readonly weekIndex: number;
  readonly title: string;
  readonly description: string;
  readonly estimatedMinutes: number;
  readonly wordTexts: readonly string[];
  readonly sentenceTexts: readonly string[];
  readonly ruleFamilyCodes: readonly string[];
}

/** First occurrence wins, order preserved — a day must not teach one rule twice. */
function distinct(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

/**
 * Several standard days as the one sprint day that replaces them.
 *
 * Merging rather than choosing is the whole point: the wizard promises "the
 * same material", so a compression that dropped a day would be the one thing it
 * said it would not do. The minutes add up because they genuinely do — a
 * doubled day really is twice the work, and `learner_profiles.daily_minutes` is
 * what the learner agreed to, not what the day claims.
 */
function mergeDays(days: readonly DayPlanEntry[]): Omit<DayPlanEntry, 'dayIndex'> {
  return {
    title: days.map((day) => day.title).join(' · '),
    focus: days.map((day) => day.focus).join(' '),
    wordTexts: days.flatMap((day) => day.wordTexts),
    sentenceTexts: days.flatMap((day) => day.sentenceTexts),
    ruleFamilyCodes: days.flatMap((day) => day.ruleFamilyCodes),
    estimatedMinutes: days.reduce((sum, day) => sum + day.estimatedMinutes, 0),
  };
}

/**
 * Every day of both tracks, ready to be written.
 *
 * The standard track is the content as authored: `dayIndex` is already global —
 * week 2 runs 8 to 14 — so it is copied straight across. The sprint track is
 * that same content redistributed by `SPRINT_DAYS_PER_WEEK`, one week at a
 * time, so a merged day never straddles a week boundary and `week_index` stays
 * a fact rather than a rounding.
 *
 * Within a week the longer days fall where `floor(k · n / m)` puts them, which
 * spreads them out instead of stacking the doubles at the end of the week —
 * the learner meets one long day, then a short one, rather than four short days
 * and a wall.
 */
function plannedDays(): readonly IPlannedDay[] {
  const planned: IPlannedDay[] = [];
  let sprintDayIndex = 0;

  for (const week of WEEKS) {
    for (const day of week.days) {
      planned.push({
        track: 'standard28',
        dayIndex: day.dayIndex,
        weekIndex: week.weekIndex,
        title: day.title,
        description: day.focus,
        estimatedMinutes: day.estimatedMinutes,
        wordTexts: day.wordTexts,
        sentenceTexts: day.sentenceTexts,
        ruleFamilyCodes: distinct(day.ruleFamilyCodes),
      });
    }

    const sprintDays = SPRINT_DAYS_PER_WEEK[week.weekIndex - 1] ?? week.days.length;

    for (let slot = 0; slot < sprintDays; slot += 1) {
      const from = Math.floor((slot * week.days.length) / sprintDays);
      const to = Math.floor(((slot + 1) * week.days.length) / sprintDays);
      const merged = mergeDays(week.days.slice(from, to));

      sprintDayIndex += 1;

      planned.push({
        track: 'sprint21',
        dayIndex: sprintDayIndex,
        weekIndex: week.weekIndex,
        title: merged.title,
        description: merged.focus,
        estimatedMinutes: merged.estimatedMinutes,
        wordTexts: merged.wordTexts,
        sentenceTexts: merged.sentenceTexts,
        ruleFamilyCodes: distinct(merged.ruleFamilyCodes),
      });
    }
  }

  return planned;
}

/**
 * A `numeric` column, as a number.
 *
 * node-postgres hands back `numeric` as a string rather than lose precision, so
 * a stored `70.00` would never equal a content `70` and every run would report
 * the row as changed.
 */
function toNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
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
    `validated: ${String(counts.words)} words, ${String(counts.sentenceItems)} sentences, ${String(counts.phonemes)} phonemes, ${String(counts.ruleFamilies)} rule families, ${String(counts.days)} programme days, ${String(counts.exams)} exams`,
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

  /*
   * The same way in as `pnpm db:migrate`, and for the same two reasons.
   *
   * This used to hand the raw value straight to `pg`, which parses it with
   * `new URL()` — so a Supabase password containing a `?` failed here with
   * `Invalid URL` after the content had validated and before a row was read,
   * and the corpus stayed empty while the landing page said its demo was
   * unavailable. Normalising the userinfo is the whole of that fix; the pooler
   * fallback below it is the second one, because the direct
   * `db.<ref>.supabase.co` host Supabase hands out is IPv6-only and does not
   * resolve on an ordinary network.
   */
  let client: pg.Client;

  try {
    client = await connectDatabase(normaliseDatabaseUrl(connectionString));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    out(`\nCould not connect to the database: ${message}`);
    out(`\n${UNREACHABLE_HELP}`);
    process.exit(1);
  }

  try {
    const plans: IPlan[] = [];

    // Order is a dependency order, not a preference: words and sentences resolve
    // rule families by code, day items resolve all three by id, and sections
    // resolve their definition. Each step reads what the one before it wrote.
    plans.push(await seedPhonemes(client));
    plans.push(await seedRuleFamilies(client));
    plans.push(await seedWords(client));
    plans.push(await seedSentences(client));
    plans.push(await seedExamDefinitions(client));
    plans.push(await seedExamSections(client));
    plans.push(await seedProgramDays(client));
    plans.push(await seedProgramDayItems(client));

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

/**
 * The five exams — `exam_definitions`, matched on `code`.
 *
 * Ungraded is expressed by three nulls travelling together, which is what 004's
 * `exam_definitions_grading_complete` checks; `content/schema.ts` refuses the
 * half-configured case before it reaches here.
 *
 * `pass_percent` is `numeric(5,2)`, and node-postgres returns numerics as
 * strings to avoid losing precision, so the stored value comes back `'70.00'`
 * where the content says `70`. Comparing those directly would report every exam
 * as changed on every run and turn the no-op second run — the property this
 * whole script is built around — into five pointless updates a night.
 */
async function seedExamDefinitions(client: pg.Client): Promise<IPlan> {
  const existing = await client.query<{
    code: string;
    title: string;
    duration_seconds: number;
    question_count: number;
    pass_percent: string | null;
    max_attempts: number | null;
    cooldown_hours: number | null;
    unlock_day_standard: number;
    unlock_day_sprint: number;
  }>(
    `select code, title, duration_seconds, question_count, pass_percent, max_attempts,
            cooldown_hours, unlock_day_standard, unlock_day_sprint
       from public.exam_definitions`,
  );

  const byCode = new Map(existing.rows.map((row) => [row.code, row]));
  let inserts = 0;
  let updates = 0;
  let unchanged = 0;

  for (const exam of EXAMS) {
    const row = byCode.get(exam.code);

    const values = [
      exam.code,
      exam.title,
      exam.durationSeconds,
      exam.questionCount,
      exam.passPercent,
      exam.maxAttempts,
      exam.cooldownHours,
      exam.unlockDayStandard,
      exam.unlockDaySprint,
    ];

    if (row === undefined) {
      await client.query(
        `insert into public.exam_definitions
           (code, title, duration_seconds, question_count, pass_percent, max_attempts,
            cooldown_hours, unlock_day_standard, unlock_day_sprint)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        values,
      );

      inserts += 1;
      continue;
    }

    const changed =
      differs(row.title, exam.title) ||
      differs(row.duration_seconds, exam.durationSeconds) ||
      differs(row.question_count, exam.questionCount) ||
      differs(toNumber(row.pass_percent), exam.passPercent) ||
      differs(row.max_attempts, exam.maxAttempts) ||
      differs(row.cooldown_hours, exam.cooldownHours) ||
      differs(row.unlock_day_standard, exam.unlockDayStandard) ||
      differs(row.unlock_day_sprint, exam.unlockDaySprint);

    if (!changed) {
      unchanged += 1;
      continue;
    }

    await client.query(
      `update public.exam_definitions
          set title = $2, duration_seconds = $3, question_count = $4, pass_percent = $5,
              max_attempts = $6, cooldown_hours = $7, unlock_day_standard = $8,
              unlock_day_sprint = $9, updated_at = now()
        where code = $1`,
      values,
    );

    updates += 1;
  }

  return { table: 'exam_definitions', inserts, updates, unchanged };
}

/**
 * The four sections of each exam — matched on (`definition_id`, `code`), which
 * is 004's own unique constraint.
 *
 * Sections are updated in place rather than replaced for the same reason words
 * are: `exam_questions.section_code` is the join every submitted paper is scored
 * through, and a delete-and-reinsert would leave a marked attempt pointing at a
 * section row that no longer exists.
 */
async function seedExamSections(client: pg.Client): Promise<IPlan> {
  const definitions = await client.query<{ id: string; code: string }>(
    'select id, code from public.exam_definitions',
  );
  const definitionId = new Map(definitions.rows.map((row) => [row.code, row.id]));

  const existing = await client.query<{
    definition_id: string;
    code: string;
    weight: string;
    order_index: number;
    question_count: number;
  }>('select definition_id, code, weight, order_index, question_count from public.exam_sections');

  const byKey = new Map(existing.rows.map((row) => [`${row.definition_id}:${row.code}`, row]));
  let inserts = 0;
  let updates = 0;
  let unchanged = 0;

  for (const exam of EXAMS) {
    const parentId = definitionId.get(exam.code);

    // Unreachable: `seedExamDefinitions` ran first and inserted every code.
    // Skipping rather than throwing keeps a partial database seedable.
    if (parentId === undefined) {
      continue;
    }

    for (const section of exam.sections) {
      const row = byKey.get(`${parentId}:${section.code}`);
      const values = [
        parentId,
        section.code,
        section.weight,
        section.orderIndex,
        section.questionCount,
      ];

      if (row === undefined) {
        await client.query(
          `insert into public.exam_sections
             (definition_id, code, weight, order_index, question_count)
           values ($1, $2, $3, $4, $5)`,
          values,
        );

        inserts += 1;
        continue;
      }

      const changed =
        differs(toNumber(row.weight), section.weight) ||
        differs(row.order_index, section.orderIndex) ||
        differs(row.question_count, section.questionCount);

      if (!changed) {
        unchanged += 1;
        continue;
      }

      await client.query(
        `update public.exam_sections
            set weight = $3, order_index = $4, question_count = $5, updated_at = now()
          where definition_id = $1 and code = $2`,
        values,
      );

      updates += 1;
    }
  }

  return { table: 'exam_sections', inserts, updates, unchanged };
}

/**
 * Every day of both tracks — `program_days`, matched on (`track`, `day_index`),
 * which is 002's own unique constraint.
 *
 * The day plans have been in the week files since Phase 9 and nothing has ever
 * written them, which is why a signed-in learner's dashboard reported no lesson
 * for today on a course that is entirely made of lessons.
 *
 * Both tracks are written, because both are offered: the wizard's second option
 * is a button a learner can press, and a track with no days is a course that
 * renders empty for everyone who presses it. `plannedDays()` derives the sprint
 * from the same content rather than from a second set of files, so the two can
 * never drift apart.
 */
async function seedProgramDays(client: pg.Client): Promise<IPlan> {
  const existing = await client.query<{
    track: string;
    day_index: number;
    week_index: number;
    title: string;
    description: string;
    estimated_minutes: number;
  }>(
    `select track, day_index, week_index, title, description, estimated_minutes
       from public.program_days`,
  );

  const byKey = new Map(existing.rows.map((row) => [`${row.track}:${String(row.day_index)}`, row]));
  let inserts = 0;
  let updates = 0;
  let unchanged = 0;

  for (const day of plannedDays()) {
    const row = byKey.get(`${day.track}:${String(day.dayIndex)}`);
    const values = [
      day.track,
      day.dayIndex,
      day.weekIndex,
      day.title,
      day.description,
      day.estimatedMinutes,
    ];

    if (row === undefined) {
      await client.query(
        `insert into public.program_days
           (track, day_index, week_index, title, description, estimated_minutes)
         values ($1, $2, $3, $4, $5, $6)`,
        values,
      );

      inserts += 1;
      continue;
    }

    const changed =
      differs(row.week_index, day.weekIndex) ||
      differs(row.title, day.title) ||
      differs(row.description, day.description) ||
      differs(row.estimated_minutes, day.estimatedMinutes);

    if (!changed) {
      unchanged += 1;
      continue;
    }

    await client.query(
      `update public.program_days
          set week_index = $3, title = $4, description = $5, estimated_minutes = $6,
              updated_at = now()
        where track = $1 and day_index = $2`,
      values,
    );

    updates += 1;
  }

  return { table: 'program_days', inserts, updates, unchanged };
}

/**
 * What each day actually contains — `program_day_items`, matched on
 * (`program_day_id`, `item_type`, `order_index`), which is 002's unique
 * constraint and also the only natural key a polymorphic row has.
 *
 * `item_id` carries no foreign key, so 002 says referential integrity "is
 * enforced by the seed CLI" — this is that promise being kept. A name the
 * corpus does not define is skipped and reported rather than inserted as a
 * dangling uuid, because a lesson item pointing at nothing renders as a blank
 * card with no way to tell what was meant.
 *
 * `order_index` counts within its type, not within the day: 002's unique
 * constraint is (day, type, order) and the three lists are three sequences a
 * learner is shown, not one.
 */
async function seedProgramDayItems(client: pg.Client): Promise<IPlan> {
  const [days, words, sentences, families] = await Promise.all([
    client.query<{ id: string; track: string; day_index: number }>(
      'select id, track, day_index from public.program_days',
    ),
    client.query<{ id: string; text: string }>('select id, text from public.words'),
    client.query<{ id: string; english_text: string }>(
      'select id, english_text from public.sentence_items',
    ),
    client.query<{ id: string; code: string }>('select id, code from public.rule_families'),
  ]);

  const dayId = new Map(days.rows.map((row) => [`${row.track}:${String(row.day_index)}`, row.id]));
  const wordId = new Map(words.rows.map((row) => [row.text, row.id]));
  const sentenceId = new Map(sentences.rows.map((row) => [row.english_text, row.id]));
  const familyId = new Map(families.rows.map((row) => [row.code, row.id]));

  const existing = await client.query<{
    program_day_id: string;
    item_type: string;
    order_index: number;
    item_id: string;
  }>('select program_day_id, item_type, order_index, item_id from public.program_day_items');

  const byKey = new Map(
    existing.rows.map((row) => [
      `${row.program_day_id}:${row.item_type}:${String(row.order_index)}`,
      row,
    ]),
  );

  let inserts = 0;
  let updates = 0;
  let unchanged = 0;

  for (const day of plannedDays()) {
    const parentId = dayId.get(`${day.track}:${String(day.dayIndex)}`);

    // Unreachable: `seedProgramDays` ran first and wrote every day of both
    // tracks. Skipping rather than throwing keeps a partial database seedable.
    if (parentId === undefined) {
      continue;
    }

    const groups: readonly {
      readonly type: string;
      readonly names: readonly string[];
      readonly lookup: Map<string, string>;
    }[] = [
      { type: 'word', names: day.wordTexts, lookup: wordId },
      { type: 'sentence', names: day.sentenceTexts, lookup: sentenceId },
      { type: 'rule_family', names: day.ruleFamilyCodes, lookup: familyId },
    ];

    for (const group of groups) {
      let orderIndex = 0;

      for (const name of group.names) {
        const itemId = group.lookup.get(name);

        if (itemId === undefined) {
          out(
            `  ${day.track} day ${String(day.dayIndex)}: no ${group.type} named "${name}" — item skipped`,
          );
          continue;
        }

        const key = `${parentId}:${group.type}:${String(orderIndex)}`;
        const row = byKey.get(key);
        const values = [parentId, group.type, orderIndex, itemId];

        orderIndex += 1;

        if (row === undefined) {
          await client.query(
            `insert into public.program_day_items (program_day_id, item_type, order_index, item_id)
             values ($1, $2, $3, $4)`,
            values,
          );

          inserts += 1;
          continue;
        }

        if (!differs(row.item_id, itemId)) {
          unchanged += 1;
          continue;
        }

        await client.query(
          `update public.program_day_items
              set item_id = $4, updated_at = now()
            where program_day_id = $1 and item_type = $2 and order_index = $3`,
          values,
        );

        updates += 1;
      }
    }
  }

  return { table: 'program_day_items', inserts, updates, unchanged };
}

seed().catch((caught: unknown) => {
  out(caught instanceof Error ? caught.message : 'content seed failed');
  process.exit(1);
});
