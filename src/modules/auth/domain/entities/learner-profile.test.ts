// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LearnerProfile } from './learner-profile';

function profile(
  onboardingCompletedAt: Date | null,
  track: 'standard28' | 'sprint21' = 'standard28',
  currentDayIndex = 1,
): LearnerProfile {
  return new LearnerProfile(
    'p1',
    'u1',
    'Ayesha',
    track,
    currentDayIndex,
    onboardingCompletedAt,
  );
}

describe('hasOnboarded', () => {
  it('is false while the timestamp is null', () => {
    expect(profile(null).hasOnboarded()).toBe(false);
  });

  it('is true once there is a timestamp', () => {
    expect(profile(new Date('2026-08-01T10:00:00Z')).hasOnboarded()).toBe(true);
  });

  it('counts the epoch as a real answer, not as absence', () => {
    // `new Date(0)` is falsy in every way that matters to a truthiness check.
    expect(profile(new Date(0)).hasOnboarded()).toBe(true);
  });
});

describe('totalDays', () => {
  it('is 28 on the standard track', () => {
    expect(profile(null, 'standard28').totalDays()).toBe(28);
  });

  it('is 21 on the sprint track', () => {
    // Day 19 is nearly finished here and two-thirds through on the other, which
    // is why the position never travels without its total.
    expect(profile(null, 'sprint21').totalDays()).toBe(21);
  });
});
