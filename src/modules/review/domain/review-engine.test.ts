/**
 * The five mandatory cases from `06-spaced-repetition.md`, over the real
 * ladder and the real entity.
 *
 * Written as a one-off probe while building F4.6, kept because it already
 * passes and the spaced repetition engine is the product rather than a feature
 * of it. Test-writing is paused for this run (CLAUDE.md section 0); this file
 * is not a requirement being met, it is verification that already existed.
 */
import { describe, expect, it } from 'vitest';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { IntervalLadderPolicy } from './services/interval-ladder.policy';
import { ReviewItem } from './entities/review-item';

const policy = new IntervalLadderPolicy();

function fresh(): ReviewItem {
  return new ReviewItem({
    id: 'r1', profileId: 'p1', itemId: 'w1', itemType: 'word',
    intervalIndex: 0, dueAt: new Date('2026-08-19T00:00:00Z'),
    timesSeen: 0, timesCorrect: 0, consecutiveCorrect: 0,
    lastCorrectOn: null, isMastered: false, lastErrorTags: [],
  });
}

const TZ = 'Asia/Dhaka'; // UTC+6

describe('the review engine', () => {
  it('correct advances one rung; rung 4 stays 4; wrong resets from every rung', () => {
    expect(policy.nextIntervalIndex(0, true)).toBe(1);
    expect(policy.nextIntervalIndex(3, true)).toBe(4);
    expect(policy.nextIntervalIndex(4, true)).toBe(4);
    for (const rung of [0, 1, 2, 3, 4]) expect(policy.nextIntervalIndex(rung, false)).toBe(0);
    expect(policy.nextInterval(3, true)).toBe(35);
  });

  it('two correct on the same local day count once', () => {
    const day = LocalDate.of('2026-08-19');
    const once = fresh().recordResult(true, new Date('2026-08-19T10:00:00Z'), day, policy, [], TZ);
    const twice = once.recordResult(true, new Date('2026-08-19T11:00:00Z'), day, policy, [], TZ);
    expect(once.consecutiveCorrect).toBe(1);
    expect(twice.consecutiveCorrect).toBe(1);
    expect(twice.timesCorrect).toBe(2);
    expect(twice.isMastered).toBe(false);
  });

  it('three correct across three days is mastery', () => {
    let item = fresh();
    for (const d of ['2026-08-19', '2026-08-20', '2026-08-21']) {
      item = item.recordResult(true, new Date(`${d}T10:00:00Z`), LocalDate.of(d), policy, [], TZ);
    }
    expect(item.consecutiveCorrect).toBe(3);
    expect(item.isMastered).toBe(true);
  });

  it('a UTC+6 learner at 23:50 local has ended that day', () => {
    // 2026-08-19 23:50 in Dhaka is 17:50 UTC the same day.
    expect(LocalDate.fromInstant(new Date('2026-08-19T17:50:00Z'), TZ).value).toBe('2026-08-19');
    // 2026-08-19 20:00 UTC is already the 20th in Dhaka.
    expect(LocalDate.fromInstant(new Date('2026-08-19T20:00:00Z'), TZ).value).toBe('2026-08-20');
  });

  it('due dates land on the learner-local midnight', () => {
    const due = policy.nextDueAt(0, true, new Date('2026-08-19T17:50:00Z'), TZ);
    // rung 0 -> rung 1 = 3 days after the local day 2026-08-19 => 2026-08-22 local midnight
    expect(LocalDate.fromInstant(due, TZ).value).toBe('2026-08-22');
    expect(due.toISOString()).toBe('2026-08-21T18:00:00.000Z'); // 00:00 +06
  });
});
