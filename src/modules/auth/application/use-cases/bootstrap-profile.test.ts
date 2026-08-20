// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { type LearnerProfile } from '../../domain/entities/learner-profile';
import { makeLearnerProfile } from '../../domain/entities/learner-profile.fixture';
import {
  type ILearnerProfileRepository,
  type INewLearnerProfile,
} from '../../domain/repositories/learner-profile-repository';
import { BootstrapProfileUseCase } from './bootstrap-profile';

/**
 * The whole point of the port is that this needs no container, no Supabase and
 * no framework — `new BootstrapProfileUseCase(fake)` and nothing else.
 *
 * The fake is a real store rather than a stub, because idempotence is a claim
 * about what happens on the second call, and a stub cannot have a second call
 * that differs from the first.
 */
class FakeProfiles implements ILearnerProfileRepository {
  readonly rows: LearnerProfile[] = [];
  inserts = 0;
  nextId = 1;

  findById(): Promise<LearnerProfile | null> {
    return Promise.reject(new Error('the request path resolves a profile by session, not by id'));
  }

  findByUserId(userId: string): Promise<LearnerProfile | null> {
    return Promise.resolve(this.rows.find((row) => row.userId === userId) ?? null);
  }

  save(): Promise<LearnerProfile> {
    return Promise.reject(new Error('bootstrap must not update an existing profile'));
  }

  /** Atomic, as the port demands: the store decides, not the caller. */
  insertIfAbsent(profile: INewLearnerProfile): Promise<LearnerProfile> {
    this.inserts += 1;

    const existing = this.rows.find((row) => row.userId === profile.userId);
    if (existing !== undefined) {
      return Promise.resolve(existing);
    }

    const created = makeLearnerProfile({
      id: `profile-${String(this.nextId)}`,
      userId: profile.userId,
      displayName: profile.displayName,
    });
    this.nextId += 1;
    this.rows.push(created);
    return Promise.resolve(created);
  }
}

let profiles: FakeProfiles;
let useCase: BootstrapProfileUseCase;

beforeEach(() => {
  profiles = new FakeProfiles();
  useCase = new BootstrapProfileUseCase(profiles);
});

describe('BootstrapProfileUseCase', () => {
  it('creates the profile when a signed-in learner has none', async () => {
    const profile = await useCase.execute({ userId: 'user-1', fullName: 'Ayesha Rahman' });

    expect(profile.userId).toBe('user-1');
    expect(profile.displayName).toBe('Ayesha Rahman');
    expect(profiles.rows).toHaveLength(1);
  });

  it('returns the existing profile without writing anything', async () => {
    profiles.rows.push(makeLearnerProfile({ id: 'profile-9' }));

    const profile = await useCase.execute({ userId: 'user-1', fullName: 'Someone Else' });

    expect(profile.id).toBe('profile-9');
    expect(profile.displayName, 'an existing name was overwritten').toBe('Ayesha');
    expect(profiles.inserts).toBe(0);
  });

  it('leaves one profile when run a hundred times', async () => {
    for (let i = 0; i < 100; i += 1) {
      await useCase.execute({ userId: 'user-1', fullName: 'Ayesha' });
    }

    expect(profiles.rows).toHaveLength(1);
  });

  it('leaves one profile when two first requests arrive at once', async () => {
    // A page load and its own prefetch are enough to produce this.
    const [first, second] = await Promise.all([
      useCase.execute({ userId: 'user-1', fullName: 'Ayesha' }),
      useCase.execute({ userId: 'user-1', fullName: 'Ayesha' }),
    ]);

    expect(profiles.rows).toHaveLength(1);
    expect(first.id).toBe(second.id);
  });

  it('keeps two learners apart', async () => {
    await useCase.execute({ userId: 'user-1', fullName: 'Ayesha' });
    await useCase.execute({ userId: 'user-2', fullName: 'Rahim' });

    expect(profiles.rows).toHaveLength(2);
  });
});

describe('the display name', () => {
  async function nameFor(input: {
    readonly fullName?: string | undefined;
    readonly email?: string | undefined;
  }): Promise<string> {
    const profile = await useCase.execute({ userId: 'user-1', ...input });
    return profile.displayName;
  }

  it('prefers the name Google gave', async () => {
    await expect(nameFor({ fullName: 'Ayesha Rahman', email: 'ayesha@example.com' })).resolves.toBe(
      'Ayesha Rahman',
    );
  });

  it('falls back to the part of the email before the @', async () => {
    await expect(nameFor({ email: 'ayesha@example.com' })).resolves.toBe('ayesha');
  });

  it('falls back again when Google sent nothing at all', async () => {
    await expect(nameFor({})).resolves.toBe('Learner');
  });

  it('treats whitespace as nothing — display_name has a non-blank check', async () => {
    await expect(nameFor({ fullName: '   ', email: 'ayesha@example.com' })).resolves.toBe('ayesha');
  });

  it('never stores a blank name, whatever it was handed', async () => {
    await expect(nameFor({ fullName: '  ', email: '  ' })).resolves.toBe('Learner');
  });

  it('trims the name rather than storing the spaces around it', async () => {
    await expect(nameFor({ fullName: '  Ayesha  ' })).resolves.toBe('Ayesha');
  });
});
