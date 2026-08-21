import { type ExamDefinitionEntry } from './schema';

/**
 * The five exams, transcribed from the definitions table in
 * `08-exam-engine.md` and from nowhere else.
 *
 * These rows had no source. 004 created `exam_definitions` and called it
 * "global content", 008 gave it a read policy, `ExamDefinition` validated it and
 * `ExamBlueprintService` drew papers from it — and nothing in the repository
 * ever produced a row. The consequence was the one PROGRESS.md predicted: the
 * onboarding wizard finishes by pushing to `/exams/diagnostic`, the lobby looks
 * the code up in a catalogue that is empty, and a learner's first act after
 * signing up is a 404.
 *
 * **Section counts are stored, not derived.** A section's share of the paper is
 * its weight, but 35% of the diagnostic's 30 questions is 10.5 and the exam has
 * to hand out whole questions. Rounding at seed time would put the arithmetic in
 * a script nobody reads; written down, the validator can hold both invariants
 * that matter — the weights total 100, and the four counts total the paper —
 * and a future exam whose numbers do not add up fails the build.
 *
 * The halves go to `dictation`, the earliest section, wherever a split is exact:
 * diagnostic 10.5/4.5 → 11 and 4, final 52.5/22.5 → 53 and 22.
 *
 * The diagnostic is ungraded — no pass mark, no attempt limit, no cooldown —
 * and 004's `exam_definitions_grading_complete` enforces that those three
 * travel together or not at all. It still carries the four sections: it is
 * ungraded, not unmarked, and the blueprint draws a paper from section counts
 * whether or not a score is compared to anything.
 */
export const EXAMS: readonly ExamDefinitionEntry[] = [
  {
    code: 'diagnostic',
    title: 'Diagnostic',
    durationSeconds: 20 * 60,
    questionCount: 30,
    passPercent: null,
    maxAttempts: null,
    cooldownHours: null,
    unlockDayStandard: 0,
    unlockDaySprint: 0,
    sections: [
      { code: 'dictation', weight: 35, orderIndex: 0, questionCount: 11 },
      { code: 'pronunciation', weight: 20, orderIndex: 1, questionCount: 6 },
      { code: 'grammar_and_construction', weight: 30, orderIndex: 2, questionCount: 9 },
      { code: 'reading_to_writing', weight: 15, orderIndex: 3, questionCount: 4 },
    ],
  },
  {
    code: 'milestone1',
    title: 'Milestone 1',
    durationSeconds: 45 * 60,
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
  },
  {
    code: 'milestone2',
    title: 'Milestone 2',
    durationSeconds: 60 * 60,
    questionCount: 80,
    passPercent: 75,
    maxAttempts: 3,
    cooldownHours: 24,
    unlockDayStandard: 14,
    unlockDaySprint: 11,
    sections: [
      { code: 'dictation', weight: 35, orderIndex: 0, questionCount: 28 },
      { code: 'pronunciation', weight: 20, orderIndex: 1, questionCount: 16 },
      { code: 'grammar_and_construction', weight: 30, orderIndex: 2, questionCount: 24 },
      { code: 'reading_to_writing', weight: 15, orderIndex: 3, questionCount: 12 },
    ],
  },
  {
    code: 'milestone3',
    title: 'Milestone 3',
    durationSeconds: 60 * 60,
    questionCount: 80,
    passPercent: 80,
    maxAttempts: 3,
    cooldownHours: 24,
    unlockDayStandard: 21,
    unlockDaySprint: 16,
    sections: [
      { code: 'dictation', weight: 35, orderIndex: 0, questionCount: 28 },
      { code: 'pronunciation', weight: 20, orderIndex: 1, questionCount: 16 },
      { code: 'grammar_and_construction', weight: 30, orderIndex: 2, questionCount: 24 },
      { code: 'reading_to_writing', weight: 15, orderIndex: 3, questionCount: 12 },
    ],
  },
  {
    code: 'final',
    title: 'Final',
    durationSeconds: 120 * 60,
    questionCount: 150,
    passPercent: 80,
    maxAttempts: 2,
    cooldownHours: 48,
    unlockDayStandard: 28,
    unlockDaySprint: 21,
    sections: [
      { code: 'dictation', weight: 35, orderIndex: 0, questionCount: 53 },
      { code: 'pronunciation', weight: 20, orderIndex: 1, questionCount: 30 },
      { code: 'grammar_and_construction', weight: 30, orderIndex: 2, questionCount: 45 },
      { code: 'reading_to_writing', weight: 15, orderIndex: 3, questionCount: 22 },
    ],
  },
];
