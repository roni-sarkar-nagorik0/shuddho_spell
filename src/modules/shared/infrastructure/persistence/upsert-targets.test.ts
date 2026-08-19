// @vitest-environment node
/**
 * Every `onConflict` target names a real unique index.
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). This sweep exists
 * because writing it caught a real bug: the review upsert targeted
 * `(profile_id, item_id)` while 003 declares
 * `unique (profile_id, item_type, item_id)`. Postgres refuses a conflict target
 * that does not match an index exactly, so **every wrong answer in the product
 * would have failed** — and nothing else here would have said so until the
 * first real submission.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = 'supabase/migrations';
const MODULES_DIR = join('src', 'modules');

function filesUnder(dir: string): readonly string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

/** Every unique index the migrations declare, as a normalised column list. */
function declaredUniqueTargets(): ReadonlySet<string> {
  const targets = new Set<string>();
  const sql = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))
    .join('\n');

  // `unique (a, b, c)` — table constraints and standalone unique indexes alike.
  for (const match of sql.matchAll(/\bunique\s*\(([^)]+)\)/giu)) {
    const columns = match[1];

    if (columns !== undefined) {
      targets.add(normalise(columns));
    }
  }

  // `col type not null unique` — a single-column constraint written inline.
  for (const match of sql.matchAll(/^\s*(\w+)\s+\w+[^,\n]*\bunique\b/gimu)) {
    const column = match[1];

    if (column !== undefined) {
      targets.add(column.toLowerCase());
    }
  }

  return targets;
}

function normalise(columns: string): string {
  return columns
    .split(',')
    .map((column) => column.trim().toLowerCase())
    .join(', ');
}

describe('upsert conflict targets', () => {
  it('each names a unique index that actually exists', () => {
    const declared = declaredUniqueTargets();

    const used = filesUnder(MODULES_DIR)
      .filter((path) => path.endsWith('.ts') && !path.endsWith('.test.ts'))
      .flatMap((path) =>
        [...readFileSync(path, 'utf8').matchAll(/onConflict:\s*'([^']+)'/gu)].flatMap((match) => {
          const target = match[1];

          return target === undefined ? [] : [{ path, target: normalise(target) }];
        }),
      );

    expect(used.length, 'no onConflict targets found — the sweep is looking in the wrong place')
      .toBeGreaterThan(0);

    expect(
      used.filter((use) => !declared.has(use.target)),
      'these conflict targets match no unique index; Postgres will refuse the statement',
    ).toEqual([]);
  });
});
