import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { LearnerProfile, type ILearnerProfileProps } from './learner-profile';

/**
 * A profile with 003's own defaults, overridable field by field.
 *
 * The entity grew from six fields to twelve in F4.3, and a test that cares
 * about the track should not have to state a playback rate to say so. The
 * defaults are the column defaults, so a fixture is a learner who has just
 * signed up and touched nothing.
 */
export function makeLearnerProfile(
  overrides: Partial<ILearnerProfileProps> = {},
): LearnerProfile {
  return new LearnerProfile({
    id: 'profile-1',
    userId: 'user-1',
    displayName: 'Ayesha',
    track: 'standard28',
    dailyMinutes: 30,
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    timezone: 'Asia/Dhaka',
    uiLanguage: 'bn',
    currentDayIndex: DayIndex.of(1),
    accentPreference: 'british',
    playbackRate: 1,
    onboardingCompletedAt: null,
    ...overrides,
  });
}
