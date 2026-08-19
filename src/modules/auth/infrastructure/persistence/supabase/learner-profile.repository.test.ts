// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { SupabaseLearnerProfileRepository } from './learner-profile.repository';
import { type IProfileDatabase } from './profile-database';

interface IUpsertCall {
  readonly values: unknown;
  readonly options: unknown;
}

interface IRow {
  readonly id: string;
  readonly user_id: string;
  readonly display_name: string;
  readonly track: string;
  readonly daily_minutes: number;
  readonly started_at: string;
  readonly timezone: string;
  readonly ui_language: string;
  readonly current_day_index: number;
  readonly accent_preference: string;
  readonly playback_rate: number;
  readonly onboarding_completed_at: string | null;
}

/**
 * A stand-in for the query builder, not for Postgres. What is worth pinning
 * here is the *shape of the call*: an insert that raises on conflict instead of
 * ignoring it is the difference between a learner's first screen working and
 * returning 500, and no behavioural test further up can see which one was sent.
 */
interface IStore {
  readonly upserts: IUpsertCall[];
  rows: IRow[];
  selectError: IError | null;
  upsertError: IError | null;
  selectedColumns: string | null;
}

interface IError {
  readonly message: string;
  readonly code?: string | undefined;
}

function fakeDatabase(store: IStore): IProfileDatabase {
  return {
    from: () => ({
      select: (columns) => {
        store.selectedColumns = columns;
        return {
          eq: (_column, value) => ({
            maybeSingle: () =>
              Promise.resolve(
                store.selectError !== null
                  ? { data: null, error: store.selectError }
                  : {
                      data: store.rows.find((row) => row.user_id === value) ?? null,
                      error: null,
                    },
              ),
          }),
        };
      },
      upsert: (values, options) => {
        store.upserts.push({ values, options });
        return Promise.resolve({ error: store.upsertError });
      },
    }),
  };
}

let store: IStore;
let repository: SupabaseLearnerProfileRepository;

const STORED: IRow = {
  id: 'profile-1',
  user_id: 'user-1',
  display_name: 'Ayesha',
  track: 'standard28',
  daily_minutes: 30,
  started_at: '2026-01-01T00:00:00Z',
  timezone: 'Asia/Dhaka',
  ui_language: 'bn',
  current_day_index: 1,
  accent_preference: 'british',
  playback_rate: 1,
  onboarding_completed_at: null,
};

beforeEach(() => {
  store = {
    upserts: [],
    rows: [],
    selectError: null,
    upsertError: null,
    selectedColumns: null,
  };
  repository = new SupabaseLearnerProfileRepository(fakeDatabase(store));
});

describe('findByUserId', () => {
  it('maps the row onto the entity', async () => {
    store.rows = [{ ...STORED, onboarding_completed_at: '2026-08-01T10:00:00Z' }];

    const profile = await repository.findByUserId('user-1');

    expect(profile?.id).toBe('profile-1');
    expect(profile?.displayName).toBe('Ayesha');
    expect(profile?.hasOnboarded()).toBe(true);
  });

  it('is null when this user has no profile', async () => {
    await expect(repository.findByUserId('user-1')).resolves.toBeNull();
  });

  it('reads the columns the entity is made of, and no more', async () => {
    await repository.findByUserId('user-1');

    expect(store.selectedColumns).toBe(
      'id, user_id, display_name, track, daily_minutes, started_at, timezone, ui_language, current_day_index, accent_preference, playback_rate, onboarding_completed_at',
    );
  });

  it('is null when the row carries a track the domain does not know', async () => {
    // 003 has a check constraint saying the same thing. This is what stops a
    // third value added there from arriving in the domain unnoticed.
    store.rows = [{ ...STORED, track: 'marathon90' }];

    await expect(repository.findByUserId('user-1')).resolves.toBeNull();
  });

  it('throws rather than reporting "no profile" when the read itself failed', async () => {
    // Those are different facts, and conflating them turns an outage into a
    // signup loop.
    store.selectError = { message: 'connection reset' };

    await expect(repository.findByUserId('user-1')).rejects.toThrow('could not read');
  });
});

describe('insertIfAbsent', () => {
  it('lets the database decide the race, rather than checking first', async () => {
    store.rows = [STORED];

    await repository.insertIfAbsent({ userId: 'user-1', displayName: 'Ayesha' });

    expect(store.upserts).toHaveLength(1);
    expect(store.upserts[0]?.options).toStrictEqual({
      onConflict: 'user_id',
      ignoreDuplicates: true,
    });
  });

  it('writes only the two columns the trigger writes', async () => {
    store.rows = [STORED];

    await repository.insertIfAbsent({ userId: 'user-1', displayName: 'Ayesha' });

    expect(store.upserts[0]?.values).toStrictEqual({
      user_id: 'user-1',
      display_name: 'Ayesha',
    });
  });

  it('returns the profile the winner of the race wrote', async () => {
    store.rows = [{ ...STORED, display_name: 'Someone Else' }];

    const profile = await repository.insertIfAbsent({ userId: 'user-1', displayName: 'Ayesha' });

    expect(profile.displayName).toBe('Someone Else');
  });

  it('survives a unique violation — that is the race resolving, not an error', async () => {
    store.rows = [STORED];
    store.upsertError = { message: 'duplicate key', code: '23505' };

    await expect(
      repository.insertIfAbsent({ userId: 'user-1', displayName: 'Ayesha' }),
    ).resolves.toBeDefined();
  });

  it('throws on any other write failure', async () => {
    store.upsertError = { message: 'permission denied', code: '42501' };

    await expect(
      repository.insertIfAbsent({ userId: 'user-1', displayName: 'Ayesha' }),
    ).rejects.toThrow('could not create');
  });

  it('throws when the write succeeded and the row is not there', async () => {
    await expect(
      repository.insertIfAbsent({ userId: 'user-1', displayName: 'Ayesha' }),
    ).rejects.toThrow('vanished');
  });
});
