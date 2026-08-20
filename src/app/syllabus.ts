/**
 * The 28-day syllabus, for the marketing page.
 *
 * Copied from `content/week-0*.meta.json` — the same titles and focus lines the
 * seeded programme uses — rather than imported, because `content/` is the
 * seeding pipeline's source and sits outside `src`. Importing it would pull the
 * whole corpus into the landing page's module graph, and the landing page is the
 * one screen with a performance budget written into its acceptance criteria.
 *
 * These are marketing copy in the honest sense: they are exactly what a learner
 * gets, so a drift here is a promise the product does not keep.
 */
export interface ISyllabusDay {
  readonly day: number;
  readonly week: number;
  readonly title: string;
  readonly focus: string;
}

export const SYLLABUS: readonly ISyllabusDay[] = [
  { day: 1, week: 1, title: 'First words', focus: 'The commonest words in English, and the sounds Bangla does not have: /v/, /w/, /θ/ and /ð/.' },
  { day: 2, week: 1, title: 'Around the house', focus: 'Everyday nouns, the a/an rule, and the short-vowel ck spelling.' },
  { day: 3, week: 1, title: 'People and family', focus: 'Family words, subject-verb agreement, and the -es plural.' },
  { day: 4, week: 1, title: 'Doubling and dropping', focus: 'Double the final consonant before a vowel suffix; drop the silent e before one.' },
  { day: 5, week: 1, title: 'Y becomes I', focus: 'Consonant plus y turns to i before a suffix — happier, carried, cities.' },
  { day: 6, week: 1, title: 'Soft c and soft g', focus: 'Why c sounds like s and g like j before e, i and y, and the tch and dge spellings.' },
  { day: 7, week: 1, title: 'I before E, and no final V', focus: 'The i-before-e rule with its real exceptions, and why no English word ends in v.' },
  { day: 8, week: 2, title: 'Nation, station, question', focus: 'The -tion and -sion endings, and why they sound the same and are spelled apart.' },
  { day: 9, week: 2, title: 'Able and ible', focus: 'A rule with no audible difference: comfortable but possible, and how to tell.' },
  { day: 10, week: 2, title: 'Letters you do not say', focus: 'Silent k, w, b, gh and h — knee, wrist, thumb, honest, island.' },
  { day: 11, week: 2, title: 'The three sounds of -ed', focus: 'Walked, opened and wanted end in /t/, /d/ and /ɪd/, and the spelling never changes.' },
  { day: 12, week: 2, title: 'Words that trade places', focus: 'Advice and advise, effect and affect, except and accept, whether and weather.' },
  { day: 13, week: 2, title: 'Tough, though, through', focus: 'The -ough family, and the numbers and seasons that carry silent letters too.' },
  { day: 14, week: 2, title: 'Endings that build words', focus: '-ness, -ly and -age: happiness, carefully, message — and the doubling they do not cause.' },
  { day: 15, week: 3, title: 'Work and money', focus: 'The -ment nouns, and the vocabulary of a job, a salary and a budget.' },
  { day: 16, week: 3, title: 'Machines and science', focus: 'Longer words with unstressed syllables, and the -cience/-cient family.' },
  { day: 17, week: 3, title: 'Study and the city', focus: 'University, library, dictionary — the -ary and -ory endings that sound alike.' },
  { day: 18, week: 3, title: 'Land, weather and animals', focus: 'The natural world, and desert against dessert.' },
  { day: 19, week: 3, title: 'Hoping and hopping', focus: 'The two rules colliding: one letter, one doubling, two different words.' },
  { day: 20, week: 3, title: 'Plurals that break the rule', focus: 'Children, women, feet, teeth, knives, leaves — before over-applying -s.' },
  { day: 21, week: 3, title: 'Character and choice', focus: 'The -ous and -ive adjectives, and the -ise verbs learners see spelled both ways.' },
  { day: 22, week: 4, title: 'Ance and ence', focus: 'Two endings that sound identical, and the words that take each.' },
  { day: 23, week: 4, title: 'Ary, ery, ory', focus: 'Stationary against stationery, and the -ary endings that lose a syllable when spoken.' },
  { day: 24, week: 4, title: 'Doubles nobody hears', focus: 'Accommodation, occurrence, embarrass — where the doubling is invisible in speech.' },
  { day: 25, week: 4, title: 'Words English borrowed', focus: 'Greek ch and ps, French -que and -gue: technique, psychology, colleague.' },
  { day: 26, week: 4, title: 'The last silent letters', focus: 'Column, muscle, hymn, resign — the letters that survive in only a few words.' },
  { day: 27, week: 4, title: 'Long verbs and their forms', focus: '-ate verbs, the -ceed/-cede split, and doubling on a stressed final syllable.' },
  { day: 28, week: 4, title: 'Everything at once', focus: 'Conditionals, reported speech and relative clauses — construction as well as spelling.' },
];

/** Where the exams fall on the standard 28-day track — 08-exam-engine.md. */
export interface IMilestoneRow {
  readonly afterDay: number;
  readonly title: string;
  readonly detail: string;
}

export const MILESTONES: readonly IMilestoneRow[] = [
  { afterDay: 7, title: 'Milestone 1', detail: '45 minutes · 60 questions · pass at 70%' },
  { afterDay: 14, title: 'Milestone 2', detail: '60 minutes · 80 questions · pass at 75%' },
  { afterDay: 21, title: 'Milestone 3', detail: '60 minutes · 80 questions · pass at 80%' },
  { afterDay: 28, title: 'Final examination', detail: '120 minutes · 150 questions · pass at 80%' },
];
