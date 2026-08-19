// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LearnerProfile } from './learner-profile';

describe('LearnerProfile', () => {
  it('has not onboarded while the timestamp is null', () => {
    expect(new LearnerProfile('p1', 'u1', 'Ayesha', null).hasOnboarded()).toBe(false);
  });

  it('has onboarded once there is a timestamp', () => {
    const profile = new LearnerProfile('p1', 'u1', 'Ayesha', new Date('2026-08-01T10:00:00Z'));

    expect(profile.hasOnboarded()).toBe(true);
  });

  it('counts the epoch as a real answer, not as absence', () => {
    // `new Date(0)` is falsy in every way that matters to a truthiness check.
    expect(new LearnerProfile('p1', 'u1', 'Ayesha', new Date(0)).hasOnboarded()).toBe(true);
  });
});
