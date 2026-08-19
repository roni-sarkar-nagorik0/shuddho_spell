// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { type LearnerProfile } from '../../domain/entities/learner-profile';
import { makeLearnerProfile } from '../../domain/entities/learner-profile.fixture';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '../../domain/repositories/learner-profile-repository';
import { GetMeUseCase } from './get-me';

class FakeProfiles implements ILearnerProfileRepository {
  rows: LearnerProfile[] = [];

  save(profile: LearnerProfile): Promise<LearnerProfile> {
    this.rows = this.rows.map((row) => (row.id === profile.id ? profile : row));
    return Promise.resolve(profile);
  }

  findByUserId(userId: string): Promise<LearnerProfile | null> {
    return Promise.resolve(this.rows.find((row) => row.userId === userId) ?? null);
  }

  insertIfAbsent(): Promise<LearnerProfile> {
    return Promise.reject(new Error('GetMe must never write'));
  }
}

let profiles: FakeProfiles;
let useCase: GetMeUseCase;

beforeEach(() => {
  profiles = new FakeProfiles();
  useCase = new GetMeUseCase(profiles);
});

describe('GetMeUseCase', () => {
  it('returns the profile behind the session', async () => {
    profiles.rows = [makeLearnerProfile({ id: 'p1', currentDayIndex: DayIndex.of(4) })];

    const profile = await useCase.execute({ userId: 'user-1' });

    expect(profile.id).toBe('p1');
    expect(profile.currentDayIndex.value).toBe(4);
  });

  it('never returns somebody else', async () => {
    profiles.rows = [
      makeLearnerProfile({
        id: 'p1',
        userId: 'user-2',
        displayName: 'Rahim',
        currentDayIndex: DayIndex.of(4),
      }),
    ];

    await expect(useCase.execute({ userId: 'user-1' })).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });

  it('says the profile is missing rather than returning null', async () => {
    // A null here would have to be given a meaning by whoever called it, and
    // the two plausible meanings — "no such learner" and "not signed in" — get
    // different status codes.
    await expect(useCase.execute({ userId: 'user-1' })).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });

  it('is a read — it never creates the profile it could not find', async () => {
    await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow(ProfileNotFoundError);
    expect(profiles.rows).toHaveLength(0);
  });
});
