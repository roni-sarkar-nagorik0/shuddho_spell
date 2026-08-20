// @vitest-environment node
/**
 * Rule 3 of `08-exam-engine.md`, asserted two ways.
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). F7.9's entire
 * deliverable is this assertion — "write a snapshot test over **every** exam
 * response and assert its absence" is what the feature *is* — so it is built
 * as a suite and run.
 *
 * Two halves, because either alone is escapable. The **behavioural** half
 * serialises every shape an exam endpoint returns before submission and looks
 * for the answer in the JSON, which catches a leak through a nested object or
 * a spread. The **structural** half sweeps the module's source for the words,
 * which catches a leak in a shape nobody has written a case for yet — the next
 * endpoint, added in Phase 12 by somebody who has not read this file.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ExamAnswer } from '../domain/entities/exam-answer';
import { ExamAttempt } from '../domain/entities/exam-attempt';
import { ExamDefinition } from '../domain/entities/exam-definition';
import { ExamQuestion } from '../domain/entities/exam-question';
import { buildExamAttemptView } from '../application/services/exam-attempt-view';

/** The string that must never appear. Distinctive on purpose. */
const SECRET = 'ABSOLUTELY-THE-ANSWER-9F2C';

const definition = new ExamDefinition({
  id: 'def-1',
  code: 'milestone1',
  title: 'Milestone 1',
  durationSeconds: 2700,
  questionCount: 60,
  passPercent: 70,
  maxAttempts: 3,
  cooldownHours: 24,
  unlockDayStandard: 7,
  unlockDaySprint: 5,
  sections: [
    { code: 'dictation', weight: 35, orderIndex: 0, questionCount: 21 },
    { code: 'pronunciation', weight: 20, orderIndex: 1, questionCount: 12 },
    { code: 'grammar_and_construction', weight: 30, orderIndex: 2, questionCount: 18 },
    { code: 'reading_to_writing', weight: 15, orderIndex: 3, questionCount: 9 },
  ],
});

const attempt = new ExamAttempt({
  id: 'attempt-1',
  profileId: 'profile-1',
  definitionId: 'def-1',
  attemptNumber: 1,
  status: 'in_progress',
  startedAt: new Date('2026-08-20T10:00:00.000Z'),
  serverDeadlineAt: new Date('2026-08-20T10:45:00.000Z'),
  submittedAt: null,
  currentSectionIndex: 0,
  scorePercent: null,
  sectionScores: {},
  passed: null,
  seed: 'seed-1',
});

const question = new ExamQuestion({
  id: 'question-1',
  attemptId: 'attempt-1',
  sectionCode: 'dictation',
  orderIndex: 0,
  type: 'dictation',
  payload: { banglaMeaning: 'জল', ipa: 'ˈwɔːtə' },
  correctAnswer: { text: SECRET },
  weight: 1,
});

const answer = new ExamAnswer({
  id: 'answer-1',
  questionId: 'question-1',
  attemptId: 'attempt-1',
  profileId: 'profile-1',
  submittedValue: 'watter',
  isCorrect: null,
  awardedPoints: 0,
  flagged: true,
  answeredAt: new Date('2026-08-20T10:05:00.000Z'),
  timeSpentMs: 4000,
});

const now = new Date('2026-08-20T10:00:30.000Z');

describe('no exam response carries the answer key before submission', () => {
  it('the attempt view — start, resume and reconnect all return this one', () => {
    const view = buildExamAttemptView({
      definition,
      attempt,
      questions: [question.forLearner()],
      answers: [answer],
      now,
    });

    expect(JSON.stringify(view)).not.toContain(SECRET);
    // And it is still a usable paper, so the absence is not because it is empty.
    expect(view.questions).toHaveLength(1);
    expect(view.remainingSeconds).toBe(2670);
  });

  it('a question offered to a learner has no key at all, not an empty one', () => {
    const offered: Record<string, unknown> = { ...question.forLearner() };

    expect(Object.keys(offered)).not.toContain('correctAnswer');
    expect(JSON.stringify(offered)).not.toContain(SECRET);
  });

  it('the saved-answer response echoes the learner, never the key', () => {
    const saved = {
      questionId: answer.questionId,
      submittedValue: answer.submittedValue,
      flagged: answer.flagged,
      remainingSeconds: attempt.remainingSeconds(now),
    };

    expect(JSON.stringify(saved)).not.toContain(SECRET);
  });

  it('the section-submit response carries progress, never the key', () => {
    const submitted = {
      attemptId: attempt.id,
      submittedSection: 'dictation',
      currentSectionIndex: 1,
      currentSectionCode: 'pronunciation',
      isPaperComplete: false,
      remainingSeconds: attempt.remainingSeconds(now),
    };

    expect(JSON.stringify(submitted)).not.toContain(SECRET);
  });

  it('the entity that does hold it still holds it — the guard is not vacuous', () => {
    // If `correctAnswer` had quietly stopped being populated, every assertion
    // above would pass while proving nothing. This is what stops that.
    expect(JSON.stringify(question)).toContain(SECRET);
  });
});

function filesUnder(dir: string): readonly string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    return statSync(path).isDirectory()
      ? filesUnder(path)
      : path.endsWith('.ts') || path.endsWith('.tsx')
        ? [path]
        : [];
  });
}

/**
 * Where the answer key is allowed to exist at all.
 *
 * It has to exist somewhere: the blueprint chooses it, the entity carries it,
 * the mapper writes the column and marking reads it back. Those are the
 * **generation and marking path** and they are listed rather than pattern-
 * matched, because the point of the list is that a *fifth* file appearing on it
 * fails the suite until somebody says out loud why it belongs.
 *
 * Note what is not here and could not be: nothing under `presentation/`, no
 * response DTO, no route.
 */
const GENERATION_AND_MARKING = [
  // Chooses the question and its answer, from the seed.
  join('src', 'modules', 'exams', 'domain', 'services', 'exam-blueprint.service.ts'),
  // Turns course content into candidate questions with their answers.
  join('src', 'modules', 'exams', 'domain', 'services', 'exam-candidate-builder.ts'),
  // Carries it, and offers `forLearner()` as the only shape without it.
  join('src', 'modules', 'exams', 'domain', 'entities', 'exam-question.ts'),
  // Declares the two projections — with the column, and deliberately without.
  join('src', 'modules', 'exams', 'infrastructure', 'mappers', 'exam-question.mapper.ts'),
  // The row interface, which describes the table and never leaves infrastructure.
  join('src', 'modules', 'exams', 'infrastructure', 'rows', 'exam-question.row.ts'),
  // Names both reads and says which is which.
  join('src', 'modules', 'exams', 'domain', 'repositories', 'exam-question-repository.ts'),
  // Persists the generated paper at attempt start.
  join('src', 'modules', 'exams', 'application', 'use-cases', 'start-exam-attempt.ts'),
  // Reads it back to mark an answer — the one legitimate consumer.
  join('src', 'modules', 'exams', 'domain', 'services', 'exam-answer-marker.ts'),
];

/**
 * The **one** response shape allowed to carry the answer key, and the guard
 * that makes it allowed.
 *
 * `08-exam-engine.md` is precise: "`GET /exams/attempts/:id/review` returns
 * correct answers. Every other exam route must not, **before submission**."
 * Rule 3 bounds the key by *time*, not by route — so the exception is not a
 * hole in the rule, it is the rule stated in full.
 *
 * Both files are listed together because neither is safe without the other: a
 * DTO with the field and no gate is a leak, and a gate protecting nothing is
 * theatre. The assertion below checks the gate is really there.
 */
const AFTER_SUBMISSION_ONLY = [
  join('src', 'modules', 'exams', 'application', 'dto', 'exam-result-view.ts'),
  join('src', 'modules', 'exams', 'application', 'use-cases', 'get-exam-answer-review.ts'),
];

/**
 * Where a response is shaped. Anything here naming the answer key is a leak by
 * definition — everything here exists to be serialised — **except** the two
 * files above, which are gated on submission.
 */
const RESPONSE_SHAPING = [
  join('src', 'modules', 'exams', 'presentation'),
  join('src', 'modules', 'exams', 'application', 'dto'),
  join('src', 'modules', 'exams', 'application', 'services'),
  join('src', 'app', 'api', 'v1', 'exams'),
];

const NAMES_THE_KEY = /correct_?[Aa]nswer/u;

describe('the answer key stays where it is allowed to be', () => {
  it('nothing that shapes a response names it', () => {
    const offenders = RESPONSE_SHAPING.flatMap(filesUnder)
      .filter((path) => !path.includes('.test.'))
      .filter((path) => !AFTER_SUBMISSION_ONLY.includes(path))
      .filter((path) => NAMES_THE_KEY.test(readFileSync(path, 'utf8')));

    expect(
      offenders,
      'these files shape responses and name the answer key — that is the leak rule 3 forbids',
    ).toEqual([]);
  });

  it('the one shape that may carry it is gated on submission', () => {
    // Without this the exception above would be a hole: a review use case that
    // stopped checking would still pass every other assertion in the file.
    const review = readFileSync(
      join('src', 'modules', 'exams', 'application', 'use-cases', 'get-exam-answer-review.ts'),
      'utf8',
    );

    expect(review).toContain('ExamNotSubmittedError');
    // And the check comes before the read that carries the key, so a premature
    // request never loads it into memory at all.
    expect(review.indexOf('ExamNotSubmittedError')).toBeLessThan(
      review.indexOf('this.questions.findByAttempt('),
    );
  });

  it('only the generation and marking path names it anywhere in the module', () => {
    const offenders = [
      ...filesUnder(join('src', 'modules', 'exams')),
      ...filesUnder(join('src', 'app', 'api', 'v1', 'exams')),
    ]
      .filter((path) => !path.includes('.test.'))
      .filter((path) => !GENERATION_AND_MARKING.includes(path))
      .filter((path) => !AFTER_SUBMISSION_ONLY.includes(path))
      .filter((path) => NAMES_THE_KEY.test(readFileSync(path, 'utf8')));

    expect(
      offenders,
      'a new file names the answer key — add it to GENERATION_AND_MARKING with a reason, or stop naming it',
    ).toEqual([]);
  });

  it('the learner-facing projection does not select the column', () => {
    const mapper = readFileSync(
      join('src', 'modules', 'exams', 'infrastructure', 'mappers', 'exam-question.mapper.ts'),
      'utf8',
    );

    const learnerColumns = /EXAM_QUESTION_LEARNER_COLUMNS\s*=\s*\n?\s*'([^']+)'/u.exec(mapper)?.[1];

    expect(learnerColumns).toBeDefined();
    expect(learnerColumns).not.toContain('correct_answer');
  });

  it('every listed generation file still names it — the list is not stale', () => {
    // A file that stopped naming the key would sit on the allowlist forever,
    // quietly widening it. This is what notices.
    const silent = [...GENERATION_AND_MARKING, ...AFTER_SUBMISSION_ONLY].filter(
      (path) => !NAMES_THE_KEY.test(readFileSync(path, 'utf8')),
    );

    expect(silent, 'these no longer name the answer key and should leave the list').toEqual([]);
  });
});
