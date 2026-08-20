// @vitest-environment node
/**
 * The eleven attacks of `08-exam-engine.md` and `.claude/commands/exam-attack.md`,
 * run against the **real use cases** over an in-memory world.
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). F7.14's entire
 * deliverable is this suite — "every one must be rejected or resumed correctly"
 * is the feature — so it is built and run.
 *
 * Fakes rather than a database, deliberately. Every attack here is about a
 * *decision* — is this write too late, is this section already locked, is this
 * the fourth attempt — and every one of those decisions is made in the domain
 * and the use case. A database would test Postgres's opinion of them, which is
 * a real thing to test and not this thing. The two writes that genuinely need a
 * transaction (015, 017) are asserted at the SQL level by their own guards.
 */
import { describe, expect, it } from 'vitest';
import { makeLearnerProfile } from '@/modules/auth/domain/entities/learner-profile.fixture';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { type LearnerProfile } from '@/modules/auth/domain/entities/learner-profile';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type SentenceItem } from '@/modules/library/domain/entities/sentence-item';
import { type Word } from '@/modules/library/domain/entities/word';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { type ReviewItem } from '@/modules/review/domain/entities/review-item';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { IntervalLadderPolicy } from '@/modules/review/domain/services/interval-ladder.policy';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { type ExamAnswer } from '../domain/entities/exam-answer';
import { ExamAttempt } from '../domain/entities/exam-attempt';
import { ExamDefinition } from '../domain/entities/exam-definition';
import { ExamQuestion } from '../domain/entities/exam-question';
import { ExamAttemptsExhaustedError } from '../domain/errors/exam-attempts-exhausted.error';
import { ExamCooldownActiveError } from '../domain/errors/exam-cooldown-active.error';
import { ExamNotFoundError } from '../domain/errors/exam-not-found.error';
import { ExamNotSubmittedError } from '../domain/errors/exam-not-submitted.error';
import { ExamTimeExpiredError } from '../domain/errors/exam-time-expired.error';
import { IllegalAttemptTransitionError } from '../domain/errors/illegal-attempt-transition.error';
import { SectionNotCurrentError } from '../domain/errors/section-not-current.error';
import { type IExamAnswerRepository } from '../domain/repositories/exam-answer-repository';
import { type IExamAttemptRepository } from '../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../domain/repositories/exam-definition-repository';
import { type IExamQuestionRepository } from '../domain/repositories/exam-question-repository';
import { type IPronunciationJudge } from '../domain/services/exam-answer-marker';
import { type IExamWriteUnit } from './ports/exam-write-unit';
import { ExamSubmissionService } from './services/exam-submission.service';
import { FlagExamQuestionUseCase } from './use-cases/flag-exam-question';
import { GetActiveExamAttemptUseCase } from './use-cases/get-active-exam-attempt';
import { GetExamAnswerReviewUseCase } from './use-cases/get-exam-answer-review';
import { SaveExamAnswerUseCase } from './use-cases/save-exam-answer';
import { StartExamAttemptUseCase } from './use-cases/start-exam-attempt';
import { SubmitExamAttemptUseCase } from './use-cases/submit-exam-attempt';
import { SubmitExamSectionUseCase } from './use-cases/submit-exam-section';

const START = new Date('2026-08-20T10:00:00.000Z');
const DURATION_SECONDS = 2700;
const DEADLINE = new Date(START.getTime() + DURATION_SECONDS * 1000);

/** A movable clock. The server's — the *only* one anything here reads. */
class TestClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(at: Date): void {
    this.current = at;
  }
}

class CountingIds implements IIdGenerator {
  private n = 0;

  next(): string {
    this.n += 1;

    return `id-${String(this.n)}`;
  }
}

function definitionWith(overrides: { readonly maxAttempts?: number } = {}): ExamDefinition {
  return new ExamDefinition({
    id: 'def-1',
    code: 'milestone1',
    title: 'Milestone 1',
    durationSeconds: DURATION_SECONDS,
    questionCount: 4,
    passPercent: 70,
    maxAttempts: overrides.maxAttempts ?? 3,
    cooldownHours: 24,
    unlockDayStandard: 7,
    unlockDaySprint: 5,
    sections: [
      { code: 'dictation', weight: 35, orderIndex: 0, questionCount: 1 },
      { code: 'pronunciation', weight: 20, orderIndex: 1, questionCount: 1 },
      { code: 'grammar_and_construction', weight: 30, orderIndex: 2, questionCount: 1 },
      { code: 'reading_to_writing', weight: 15, orderIndex: 3, questionCount: 1 },
    ],
  });
}

function liveAttempt(overrides: Partial<ConstructorParameters<typeof ExamAttempt>[0]> = {}): ExamAttempt {
  return new ExamAttempt({
    id: 'attempt-1',
    profileId: 'profile-1',
    definitionId: 'def-1',
    attemptNumber: 1,
    status: 'in_progress',
    startedAt: START,
    serverDeadlineAt: DEADLINE,
    submittedAt: null,
    currentSectionIndex: 0,
    scorePercent: null,
    sectionScores: {},
    passed: null,
    seed: 'seed-1',
    ...overrides,
  });
}

function question(id: string, section: 'dictation' | 'pronunciation'): ExamQuestion {
  return new ExamQuestion({
    id,
    attemptId: 'attempt-1',
    sectionCode: section,
    orderIndex: 0,
    type: section,
    payload: { wordId: `word-${id}` },
    correctAnswer: { text: 'water', ipa: 'ˈwɔːtə' },
    weight: 1,
  });
}

/** Everything the exam use cases talk to, held in memory. */
interface IWorld {
  readonly clock: TestClock;
  readonly attempts: ExamAttempt[];
  readonly answers: ExamAnswer[];
  readonly questions: ExamQuestion[];
  readonly profile: LearnerProfile;
  readonly definition: ExamDefinition;
  readonly startCalls: { count: number };
}

function makeWorld(overrides: {
  readonly attempts?: ExamAttempt[];
  readonly definition?: ExamDefinition;
  readonly profile?: LearnerProfile;
  readonly at?: Date;
} = {}): IWorld {
  return {
    clock: new TestClock(overrides.at ?? new Date(START.getTime() + 30_000)),
    attempts: overrides.attempts ?? [liveAttempt()],
    answers: [],
    questions: [question('question-1', 'dictation'), question('question-2', 'pronunciation')],
    // Day 8, so `milestone1`'s own day-7 lock is not what refuses anything
    // here. It refused four of these attacks on the first run, which is the
    // guard working and the setup being wrong — the attacks below are about
    // what happens *after* the exam is reachable.
    profile:
      overrides.profile ??
      makeLearnerProfile({ id: 'profile-1', userId: 'user-1', currentDayIndex: DayIndex.of(8) }),
    definition: overrides.definition ?? definitionWith(),
    startCalls: { count: 0 },
  };
}

function wire(world: IWorld): {
  readonly start: StartExamAttemptUseCase;
  readonly save: SaveExamAnswerUseCase;
  readonly flag: FlagExamQuestionUseCase;
  readonly submitSection: SubmitExamSectionUseCase;
  readonly submit: SubmitExamAttemptUseCase;
  readonly active: GetActiveExamAttemptUseCase;
  readonly review: GetExamAnswerReviewUseCase;
} {
  const profiles: ILearnerProfileRepository = {
    findByUserId: (userId) =>
      Promise.resolve(userId === world.profile.userId ? world.profile : null),
    findById: (id) => Promise.resolve(id === world.profile.id ? world.profile : null),
    insertIfAbsent: () => Promise.reject(new Error('not used')),
    listAll: () => Promise.reject(new Error('only the hourly notification job walks the roster')),
    save: () => Promise.reject(new Error('not used')),
  };

  const definitions: IExamDefinitionRepository = {
    findByCode: (code) => Promise.resolve(code === world.definition.code ? world.definition : null),
    findById: (id) => Promise.resolve(id === world.definition.id ? world.definition : null),
    listAll: () => Promise.resolve([world.definition]),
  };

  const attempts: IExamAttemptRepository = {
    findById: (id) => Promise.resolve(world.attempts.find((a) => a.id === id) ?? null),
    findActive: (profileId, definitionId) =>
      Promise.resolve(
        world.attempts.find(
          (a) =>
            a.profileId === profileId &&
            a.definitionId === definitionId &&
            a.status === 'in_progress',
        ) ?? null,
      ),
    findActiveForProfile: (profileId) =>
      Promise.resolve(
        world.attempts.find((a) => a.profileId === profileId && a.status === 'in_progress') ?? null,
      ),
    findForExam: (profileId, definitionId) =>
      Promise.resolve(
        world.attempts.filter((a) => a.profileId === profileId && a.definitionId === definitionId),
      ),
    findAllForProfile: (profileId) =>
      Promise.resolve(world.attempts.filter((a) => a.profileId === profileId)),
    findAbandoned: () => Promise.resolve([]),
    save: (attempt) => {
      const index = world.attempts.findIndex((a) => a.id === attempt.id);

      if (index >= 0) {
        world.attempts[index] = attempt;
      }

      return Promise.resolve(attempt);
    },
  };

  const questions: IExamQuestionRepository = {
    findByAttempt: (attemptId) =>
      Promise.resolve(world.questions.filter((q) => q.attemptId === attemptId)),
    findById: (id) => Promise.resolve(world.questions.find((q) => q.id === id) ?? null),
    findByAttemptForLearner: (attemptId) =>
      Promise.resolve(
        world.questions.filter((q) => q.attemptId === attemptId).map((q) => q.forLearner()),
      ),
  };

  const answers: IExamAnswerRepository = {
    findByAttempt: (attemptId) =>
      Promise.resolve(world.answers.filter((a) => a.attemptId === attemptId)),
    findByQuestion: (questionId) =>
      Promise.resolve(world.answers.find((a) => a.questionId === questionId) ?? null),
    upsert: (answer) => {
      const index = world.answers.findIndex((a) => a.questionId === answer.questionId);

      if (index >= 0) {
        world.answers[index] = answer;
      } else {
        world.answers.push(answer);
      }

      return Promise.resolve(answer);
    },
    upsertMany: () => Promise.resolve(),
  };

  const reviews: IReviewItemRepository = {
    findDue: () => Promise.resolve([] as readonly ReviewItem[]),
    findByItem: () => Promise.resolve(null),
    upsert: (item) => Promise.resolve(item),
    countDue: () => Promise.resolve(0),
    findByProfile: () => Promise.resolve([] as readonly ReviewItem[]),
  };

  const words: IWordRepository = {
    findById: () => Promise.resolve(null),
    findByIds: () => Promise.resolve([] as readonly Word[]),
    findUpToWeek: () => Promise.resolve([] as readonly Word[]),
  };

  const sentences: ISentenceItemRepository = {
    findById: () => Promise.resolve(null),
    findByIds: () => Promise.resolve([] as readonly SentenceItem[]),
    listAll: () => Promise.resolve([] as readonly SentenceItem[]),
  };

  const writes: IExamWriteUnit = {
    startAttempt: (write) => {
      world.startCalls.count += 1;
      world.attempts.push(write.attempt);

      return Promise.resolve(write.attempt.id);
    },
    submitAttempt: (write) => {
      const index = world.attempts.findIndex((a) => a.id === write.attempt.id);

      if (index >= 0) {
        world.attempts[index] = write.attempt;
      }

      return Promise.resolve();
    },
  };

  const judge: IPronunciationJudge = { scorePercent: () => Promise.resolve(100) };
  const ids = new CountingIds();

  const submissions = new ExamSubmissionService(judge, new IntervalLadderPolicy(), ids, writes);

  return {
    start: new StartExamAttemptUseCase(
      profiles,
      definitions,
      attempts,
      questions,
      answers,
      words,
      sentences,
      reviews,
      world.clock,
      ids,
      writes,
    ),
    save: new SaveExamAnswerUseCase(profiles, attempts, questions, answers, world.clock, ids),
    flag: new FlagExamQuestionUseCase(profiles, attempts, questions, answers, world.clock, ids),
    submitSection: new SubmitExamSectionUseCase(profiles, definitions, attempts, world.clock),
    submit: new SubmitExamAttemptUseCase(
      profiles,
      definitions,
      attempts,
      questions,
      answers,
      reviews,
      world.clock,
      submissions,
    ),
    active: new GetActiveExamAttemptUseCase(
      profiles,
      definitions,
      attempts,
      questions,
      answers,
      world.clock,
    ),
    review: new GetExamAnswerReviewUseCase(profiles, attempts, questions, answers),
  };
}

const USER = { userId: 'user-1', attemptId: 'attempt-1' };

describe('the exam attack suite', () => {
  it('1 · an answer saved after the deadline is refused', async () => {
    const world = makeWorld();
    const cases = wire(world);

    world.clock.set(new Date(DEADLINE.getTime() + 1000));

    await expect(
      cases.save.execute({ ...USER, questionId: 'question-1', submittedValue: 'water', timeSpentMs: null }),
    ).rejects.toBeInstanceOf(ExamTimeExpiredError);
  });

  it('2 · moving the client clock forward changes nothing', async () => {
    const world = makeWorld();
    const cases = wire(world);

    // There is no argument anywhere by which a client could assert the time.
    // The only clock is the server's, and it says thirty seconds have passed.
    const view = await cases.active.execute({ userId: USER.userId });

    expect(view?.remainingSeconds).toBe(DURATION_SECONDS - 30);

    // Even a saved answer answers with the server's remaining time, so a client
    // that lied to itself is corrected on every write.
    const saved = await cases.save.execute({
      ...USER,
      questionId: 'question-1',
      submittedValue: 'water',
      timeSpentMs: 999_999_999,
    });

    expect(saved.remainingSeconds).toBe(DURATION_SECONDS - 30);
  });

  it('3 · submitting the same section twice is refused', async () => {
    const world = makeWorld();
    const cases = wire(world);

    await cases.submitSection.execute({ ...USER, sectionCode: 'dictation' });

    await expect(
      cases.submitSection.execute({ ...USER, sectionCode: 'dictation' }),
    ).rejects.toBeInstanceOf(SectionNotCurrentError);
  });

  it('4 · starting a second concurrent attempt resumes the first', async () => {
    const world = makeWorld();
    const cases = wire(world);

    const resumed = await cases.start.execute({ userId: USER.userId, code: 'milestone1' });

    expect(resumed.attemptId).toBe('attempt-1');
    // Nothing was written, so no second attempt exists to race the first.
    expect(world.startCalls.count).toBe(0);
    expect(world.attempts).toHaveLength(1);
  });

  it('5 · refreshing at the thirty-second mark resumes with the time actually left', async () => {
    const world = makeWorld();
    const cases = wire(world);

    await cases.save.execute({
      ...USER,
      questionId: 'question-1',
      submittedValue: 'watter',
      timeSpentMs: 4000,
    });

    // The tab dies. Ten minutes later it comes back.
    world.clock.set(new Date(START.getTime() + 630_000));

    const view = await cases.active.execute({ userId: USER.userId });

    expect(view?.remainingSeconds).toBe(DURATION_SECONDS - 630);
    expect(view?.answers).toEqual([
      { questionId: 'question-1', submittedValue: 'watter', flagged: false },
    ]);
  });

  it('6 · the deadline survives a resume — it is never recomputed', async () => {
    const world = makeWorld();
    const cases = wire(world);

    world.clock.set(new Date(START.getTime() + 600_000));

    const resumed = await cases.start.execute({ userId: USER.userId, code: 'milestone1' });

    expect(resumed.serverDeadlineAt).toBe(DEADLINE.toISOString());
    expect(resumed.remainingSeconds).toBe(DURATION_SECONDS - 600);
  });

  it('7 · replaying a saved answer after submission is refused', async () => {
    const world = makeWorld();
    const cases = wire(world);

    await cases.submit.execute(USER);

    await expect(
      cases.save.execute({ ...USER, questionId: 'question-1', submittedValue: 'late', timeSpentMs: null }),
    ).rejects.toBeInstanceOf(IllegalAttemptTransitionError);
  });

  it('8 · flagging after submission is refused too — a flag is a write', async () => {
    const world = makeWorld();
    const cases = wire(world);

    await cases.submit.execute(USER);

    await expect(
      cases.flag.execute({ ...USER, questionId: 'question-1', flagged: true }),
    ).rejects.toBeInstanceOf(IllegalAttemptTransitionError);
  });

  it('9 · the review endpoint is unreachable before submission', async () => {
    const world = makeWorld();
    const cases = wire(world);

    await expect(cases.review.execute(USER)).rejects.toBeInstanceOf(ExamNotSubmittedError);

    await cases.submit.execute(USER);

    const review = await cases.review.execute(USER);

    // And afterwards it is the one place the answer key appears.
    expect(review.items[0]?.correctAnswer).toEqual({ text: 'water', ipa: 'ˈwɔːtə' });
  });

  it('10 · a fourth attempt at a three-attempt exam is refused', async () => {
    const finished = [1, 2, 3].map((n) =>
      liveAttempt({
        id: `attempt-${String(n)}`,
        attemptNumber: n,
        status: 'failed',
        submittedAt: new Date('2026-08-01T10:00:00.000Z'),
        passed: false,
      }),
    );

    const world = makeWorld({ attempts: finished, at: new Date('2026-08-20T10:00:00.000Z') });
    const cases = wire(world);

    await expect(
      cases.start.execute({ userId: USER.userId, code: 'milestone1' }),
    ).rejects.toBeInstanceOf(ExamAttemptsExhaustedError);
  });

  it('11 · a retake inside the cooldown is refused, with the time left', async () => {
    const submittedAt = new Date('2026-08-20T06:00:00.000Z');
    const world = makeWorld({
      attempts: [liveAttempt({ status: 'failed', submittedAt, passed: false })],
      at: new Date('2026-08-20T10:00:00.000Z'),
    });
    const cases = wire(world);

    const failure = await cases.start
      .execute({ userId: USER.userId, code: 'milestone1' })
      .then(() => null)
      .catch((caught: unknown) => caught);

    expect(failure).toBeInstanceOf(ExamCooldownActiveError);
    // Twenty of the twenty-four hours remain, and the learner is told so.
    expect((failure as ExamCooldownActiveError).remainingSeconds).toBe(20 * 3600);
  });

  it('12 · answering a question from somebody else’s attempt is refused', async () => {
    const world = makeWorld();
    const cases = wire(world);

    world.questions.push(
      new ExamQuestion({
        id: 'foreign-question',
        attemptId: 'somebody-elses-attempt',
        sectionCode: 'dictation',
        orderIndex: 0,
        type: 'dictation',
        payload: {},
        correctAnswer: { text: 'x' },
        weight: 1,
      }),
    );

    await expect(
      cases.save.execute({
        ...USER,
        questionId: 'foreign-question',
        submittedValue: 'x',
        timeSpentMs: null,
      }),
    ).rejects.toBeInstanceOf(ExamNotFoundError);
  });

  it('13 · another learner cannot reach this attempt at all', async () => {
    const world = makeWorld();
    const cases = wire(world);

    // A verified session for somebody with no profile in this world: the id in
    // the url is not enough, and never is.
    await expect(
      cases.save.execute({
        userId: 'user-1',
        attemptId: 'not-my-attempt',
        questionId: 'question-1',
        submittedValue: 'x',
        timeSpentMs: null,
      }),
    ).rejects.toBeInstanceOf(ExamNotFoundError);
  });
});
