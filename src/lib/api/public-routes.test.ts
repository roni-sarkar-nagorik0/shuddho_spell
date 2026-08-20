// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
  // The API description. It describes shapes, not data, and documentation that
  // needs a session to read is a puzzle rather than documentation.
  'src/app/api/v1/openapi.json/route.ts',
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

/**
 * A `route.ts` is a three-line re-export, so reading it alone tells you almost
 * nothing — the `auth: 'public'` that matters lives in the handler it points
 * at, one or two hops away.
 *
 * This was a real hole. Until F5.9a every handler that opted out happened to be
 * written inline in its `route.ts`, so the sweep looked exhaustive and was not:
 * a module handler could have gone public without ever appearing on the list.
 * Following the re-export is what makes "every public endpoint is written down"
 * true rather than merely tested.
 *
 * Two hops, because `route.ts` → `src/composition/handlers.ts` → the module's
 * handler factory is the deepest this codebase's convention goes.
 */
function sourceBehind(routePath: string, depth = 2): string {
  const source = readFileSync(routePath, 'utf8');

  if (depth === 0) {
    return source;
  }

  const imported = [...source.matchAll(/from '([^']+)'/gu)].flatMap((match) => {
    const specifier = match[1];

    if (specifier === undefined) {
      return [];
    }

    const resolved = specifier.startsWith('@/')
      ? join('src', specifier.slice('@/'.length))
      : join(routePath, '..', specifier);

    for (const candidate of [`${resolved}.ts`, `${resolved}.tsx`, join(resolved, 'index.ts')]) {
      if (existsSync(candidate)) {
        return [sourceBehind(candidate, depth - 1)];
      }
    }

    return [];
  });

  return [source, ...imported].join('\n');
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
      const source = sourceBehind(path);
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
