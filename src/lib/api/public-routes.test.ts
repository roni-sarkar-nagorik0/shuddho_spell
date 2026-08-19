// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * F3.7 — protection is by omission, so the thing worth guarding is the
 * omission's opposite: every route that opts out is written down here, and a
 * new public endpoint fails this test until somebody adds it on purpose.
 *
 * That is the whole point of `auth: 'public'` being a word rather than a
 * boolean flag. A word can be counted across a tree.
 */

const API_DIR = 'src/app/api';

const PUBLIC_ROUTES: readonly string[] = [
  // Liveness. A probe has no session and never will.
  'src/app/api/health/route.ts',
  // Readiness, same — and it must answer while the database is down, which is
  // exactly when a session lookup would not.
  'src/app/api/ready/route.ts',
  // Cron routes go here as they land (Phase 8 onward). They have no user; the
  // `withCron` bearer check is what stands in for one.
];

function routeFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === 'route.ts' ? [path] : [];
  });
}

const routes = routeFiles(API_DIR);

describe('api routes', () => {
  it('finds routes to check at all', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it('has no public endpoint that is not on the list', () => {
    // `withCron` opts out too — it authenticates with a shared secret instead
    // of a session — so a cron route has to be listed like any other.
    const opting = routes.filter((path) => {
      const source = readFileSync(path, 'utf8');
      return source.includes("auth: 'public'") || source.includes('withCron(');
    });

    expect([...opting].sort()).toStrictEqual([...PUBLIC_ROUTES].sort());
  });

  it('spells the opt-out one way — a boolean would be a second, quieter one', () => {
    for (const path of routes) {
      expect(readFileSync(path, 'utf8'), `${path} passes a boolean to auth`).not.toMatch(
        /auth:\s*(true|false)/u,
      );
    }
  });

  it('never says required out loud, because that is what saying nothing means', () => {
    // Writing it invites the reading that its absence means something else.
    for (const path of routes) {
      expect(readFileSync(path, 'utf8'), `${path} restates the default`).not.toContain(
        "auth: 'required'",
      );
    }
  });
});
