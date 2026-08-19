// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { LearnerProfile } from '../../domain/entities/learner-profile';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '../../domain/repositories/learner-profile-repository';
import { GetMeUseCase } from './get-me';

class FakeProfiles implements ILearnerProfileRepository {
  rows: LearnerProfile[] = [];

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
    profiles.rows = [new LearnerProfile('p1', 'user-1', 'Ayesha', 'standard28', 4, null)];

    const profile = await useCase.execute({ userId: 'user-1' });

    expect(profile.id).toBe('p1');
    expect(profile.currentDayIndex).toBe(4);
  });

  it('never returns somebody else', async () => {
    profiles.rows = [new LearnerProfile('p1', 'user-2', 'Rahim', 'standard28', 4, null)];

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
