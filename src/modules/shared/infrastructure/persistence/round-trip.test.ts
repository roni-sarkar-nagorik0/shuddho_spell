// @vitest-environment node
/**
 * F5.2's criterion: **round-trip mapping is lossless.**
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). This one is here
 * because "both directions agree" is a claim about ten pairs of functions that
 * typecheck perfectly while dropping a field — and a mapper that loses
 * `common_misspellings` on the way out makes every wrong answer untaggable, on
 * a code path nobody looks at again.
 *
 * Entity → row → entity, and the two entities must match.
 */
import { describe, expect, it } from 'vitest';
import { Attempt } from '@/modules/lessons/domain/entities/attempt';
import { LessonSession } from '@/modules/lessons/domain/entities/lesson-session';
import { toAttempts, toAttemptRow } from '@/modules/lessons/infrastructure/mappers/attempt.mapper';
import {
  toLessonSession,
  toLessonSessionRow,
} from '@/modules/lessons/infrastructure/mappers/lesson-session.mapper';
import { Phoneme } from '@/modules/library/domain/entities/phoneme';
import { RuleFamily } from '@/modules/library/domain/entities/rule-family';
import { SentenceItem } from '@/modules/library/domain/entities/sentence-item';
import { Word } from '@/modules/library/domain/entities/word';
import { toPhonemeRow, toPhonemes } from '@/modules/library/infrastructure/mappers/phoneme.mapper';
import {
  toRuleFamilies,
  toRuleFamilyRow,
} from '@/modules/library/infrastructure/mappers/rule-family.mapper';
import {
  toSentenceItem,
  toSentenceItemRow,
} from '@/modules/library/infrastructure/mappers/sentence-item.mapper';
import { toWord, toWordRow } from '@/modules/library/infrastructure/mappers/word.mapper';
import { ProgramDay } from '@/modules/program/domain/entities/program-day';
import {
  toProgramDayRow,
  toProgramDays,
} from '@/modules/program/infrastructure/mappers/program-day.mapper';
import { MasteryRecord } from '@/modules/progress/domain/entities/mastery-record';
import { StreakRecord } from '@/modules/progress/domain/entities/streak-record';
import {
  toMasteryRecordRow,
  toMasteryRecords,
} from '@/modules/progress/infrastructure/mappers/mastery-record.mapper';
import {
  toStreakRecord,
  toStreakRecordRow,
} from '@/modules/progress/infrastructure/mappers/streak-record.mapper';
import { ReviewItem } from '@/modules/review/domain/entities/review-item';
import {
  toReviewItem,
  toReviewItemRow,
} from '@/modules/review/infrastructure/mappers/review-item.mapper';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { ScorePercent } from '@/modules/shared/domain/value-objects/score-percent';

const WHEN = new Date('2026-08-19T10:00:00.000Z');

describe('every mapper survives a round trip', () => {
  it('Word — including the misspellings that make a wrong answer taggable', () => {
    const word = new Word(
      'w1', 'writing', IpaTranscription.of('ˈraɪtɪŋ'), ['wri', 'ting'],
      'রাইটিং', 'লেখা', 'noun', 'rf1', 2, 400, ['writting', 'writeing'],
    );

    expect(toWord(toWordRow(word))).toStrictEqual(word);
  });

  it('Phoneme — including a null Bangla equivalent, which is data', () => {
    const phoneme = new Phoneme('p1', IpaTranscription.of('θ'), 'consonant', null, 'tongue between teeth', 't');

    expect(toPhonemes([toPhonemeRow(phoneme)])[0]).toStrictEqual(phoneme);
  });

  it('RuleFamily — three examples and two counterexamples', () => {
    const family = new RuleFamily('rf1', 'doubling', 'Double the final consonant.', ['a', 'b', 'c'], ['d', 'e']);

    expect(toRuleFamilies([toRuleFamilyRow(family)])[0]).toStrictEqual(family);
  });

  it('SentenceItem — including the accepted alternatives', () => {
    const item = new SentenceItem(
      's1', 'আমি বাড়ি যাচ্ছি', 'I am going home', ['I am heading home'], ['went', 'go'], ['rf2'], 'medium',
    );

    expect(toSentenceItem(toSentenceItemRow(item))).toStrictEqual(item);
  });

  it('ProgramDay — the overview shape, without items', () => {
    const day = new ProgramDay('d1', 'standard28', DayIndex.of(5), 1, 'Silent letters', 'Words that lie.', 25, []);

    expect(toProgramDays([toProgramDayRow(day)])[0]).toStrictEqual(day);
  });

  it('LessonSession — including a null completedAt', () => {
    const session = new LessonSession({
      id: 'ls1', profileId: 'p1', dayIndex: DayIndex.of(3), stage: 'dictate',
      startedAt: WHEN, completedAt: null, itemsTotal: 7, itemsCorrect: 5,
    });

    expect(toLessonSession(toLessonSessionRow(session))).toStrictEqual(session);
  });

  it('Attempt — including the error tags and a null latency', () => {
    const attempt = new Attempt({
      id: 'a1', sessionId: 'ls1', profileId: 'p1', itemType: 'word', itemId: 'w1',
      mode: 'dictation', submittedValue: 'writting', isCorrect: false,
      score: ScorePercent.of(0), errorTags: ['DOUBLE_CONSONANT'], latencyMs: null, createdAt: WHEN,
    });

    expect(toAttempts([toAttemptRow(attempt)])[0]).toStrictEqual(attempt);
  });

  it('ReviewItem — including the learner-local last-correct date', () => {
    const item = new ReviewItem({
      id: 'r1', profileId: 'p1', itemId: 'w1', itemType: 'word', intervalIndex: 2,
      dueAt: WHEN, timesSeen: 9, timesCorrect: 6, consecutiveCorrect: 2,
      lastCorrectOn: LocalDate.of('2026-08-18'), isMastered: false, lastErrorTags: ['SILENT_LETTER'],
    });

    expect(toReviewItem(toReviewItemRow(item))).toStrictEqual(item);
  });

  it('MasteryRecord — accuracy is written but derived on the way back', () => {
    const record = new MasteryRecord({
      id: 'm1', profileId: 'p1', dimension: 'rule_family', dimensionId: 'rf1',
      attempts: 5, correct: 4, lastUpdatedAt: WHEN,
    });

    const back = toMasteryRecords([toMasteryRecordRow(record)])[0];

    expect(back).toStrictEqual(record);
    expect(back?.accuracy().value).toBe(80);
  });

  it('StreakRecord — including a null last-active date', () => {
    const record = new StreakRecord({
      id: 's1', profileId: 'p1', currentStreak: 4, longestStreak: 9,
      lastActiveDate: LocalDate.of('2026-08-19'), freezesRemaining: 1,
    });

    expect(toStreakRecord(toStreakRecordRow(record))).toStrictEqual(record);
  });
});
