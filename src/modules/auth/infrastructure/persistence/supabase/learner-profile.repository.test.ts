// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import {
  type IDatabase,
  type ISelectQuery,
  type IUpsertOptions,
} from '@/modules/shared/infrastructure/persistence/database';
import { DatabaseError } from '@/modules/shared/infrastructure/persistence/database-error';
import { SupabaseLearnerProfileRepository } from './learner-profile.repository';

/**
 * A stand-in for the `IDatabase` seam, not for Postgres.
 *
 * What is worth pinning here is the *shape of the call*: an upsert that
 * overwrites on conflict instead of ignoring it is the difference between the
 * winner of a race keeping their display name and the loser stamping over it,
 * and no behavioural test further up can see which one was sent.
 *
 * F5.1 moved this repository off its own bespoke `IProfileDatabase` onto the
 * seam every repository shares, so the fake moved with it.
 */
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

interface IUpsertCall {
  readonly values: readonly Readonly<Record<string, unknown>>[];
  readonly options: IUpsertOptions;
}

interface IUpdateCall {
  readonly values: Readonly<Record<string, unknown>>;
  readonly match: Readonly<Record<string, string>>;
}

interface IStore {
  readonly upserts: IUpsertCall[];
  readonly updates: IUpdateCall[];
  rows: IRow[];
  selectError: DatabaseError | null;
  upsertError: DatabaseError | null;
  updateError: DatabaseError | null;
  selectedColumns: string | null;
}

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

function fakeDatabase(store: IStore): IDatabase {
  const notUsed = (): never => {
    throw new Error('the profile repository does not use this');
  };

  return {
    selectOne: (query: ISelectQuery) => {
      store.selectedColumns = query.columns;

      if (store.selectError !== null) {
        return Promise.reject(store.selectError);
      }

      const userId = query.eq?.['user_id'];

      return Promise.resolve(store.rows.find((row) => row.user_id === userId) ?? null);
    },
    upsert: (_table, values, options) => {
      store.upserts.push({ values, options });

      return store.upsertError === null
        ? Promise.resolve()
        : Promise.reject(store.upsertError);
    },
    update: (_table, values, match) => {
      store.updates.push({ values, match });

      return store.updateError === null
        ? Promise.resolve()
        : Promise.reject(store.updateError);
    },
    select: notUsed,
    count: notUsed,
    insert: notUsed,
    rpc: notUsed,
  };
}

let store: IStore;
let repository: SupabaseLearnerProfileRepository;

beforeEach(() => {
  store = {
    upserts: [],
    updates: [],
    rows: [],
    selectError: null,
    upsertError: null,
    updateError: null,
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
    store.selectError = new DatabaseError('could not read learner_profiles', null, 'connection reset');

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

    expect(store.upserts[0]?.values).toStrictEqual([
      {
        user_id: 'user-1',
        display_name: 'Ayesha',
      },
    ]);
  });

  it('returns the profile the winner of the race wrote', async () => {
    store.rows = [{ ...STORED, display_name: 'Someone Else' }];

    const profile = await repository.insertIfAbsent({ userId: 'user-1', displayName: 'Ayesha' });

    expect(profile.displayName).toBe('Someone Else');
  });

  it('survives a unique violation — that is the race resolving, not an error', async () => {
    store.rows = [STORED];
    store.upsertError = new DatabaseError('could not write learner_profiles', '23505', 'duplicate key');

    await expect(
      repository.insertIfAbsent({ userId: 'user-1', displayName: 'Ayesha' }),
    ).resolves.toBeDefined();
  });

  it('throws on any other write failure', async () => {
    store.upsertError = new DatabaseError('could not write learner_profiles', '42501', 'permission denied');

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
