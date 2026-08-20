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
  // Cron routes. They have no user; the `withCron` bearer check — a constant-
  // time compare against `CRON_SECRET`, header only — is what stands in for one.
  'src/app/api/cron/exam-autosubmit/route.ts',
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
 * This was a real hole twice over.
 *
 * Until F5.9a every handler that opted out happened to be written inline in its
 * `route.ts`, so the sweep looked exhaustive and was not: a module handler could
 * have gone public without appearing on the list.
 *
 * Then F7.13 exposed the opposite failure. Following *every* import of
 * `src/composition/handlers.ts` and joining the text meant one cron handler in
 * the barrel made **every** route in the application look like an opt-out — a
 * sweep that fails for all routes is as useless as one that passes for all of
 * them, and it fails in the direction that gets it disabled.
 *
 * So the walk follows the **specific handler**, not the barrel: the symbol the
 * route re-exports, the one `export const` that defines it, and the factory
 * that declaration calls. Nothing else in the barrel is read.
 */
function resolveModule(specifier: string, fromFile: string): string | null {
  const base = specifier.startsWith('@/')
    ? join('src', specifier.slice('@/'.length))
    : join(fromFile, '..', specifier);

  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/** The `export const <name> = …;` statement, and nothing around it. */
function declarationOf(source: string, name: string): string | null {
  const start = source.indexOf(`export const ${name} =`);

  if (start === -1) {
    return null;
  }

  const rest = source.slice(start + 1);
  const next = rest.indexOf('\nexport ');

  return next === -1 ? source.slice(start) : source.slice(start, start + 1 + next);
}

function sourceBehind(routePath: string): string {
  const route = readFileSync(routePath, 'utf8');
  const parts: string[] = [route];

  for (const match of route.matchAll(/export\s*\{\s*(\w+)\s+as\s+\w+\s*\}\s*from\s*'([^']+)'/gu)) {
    const symbol = match[1];
    const specifier = match[2];

    if (symbol === undefined || specifier === undefined) {
      continue;
    }

    const modulePath = resolveModule(specifier, routePath);

    if (modulePath === null) {
      continue;
    }

    const moduleSource = readFileSync(modulePath, 'utf8');
    const declaration = declarationOf(moduleSource, symbol);

    if (declaration === null) {
      // Not a barrel re-export — the handler is defined here in full.
      parts.push(moduleSource);
      continue;
    }

    parts.push(declaration);

    // The factory the declaration calls, wherever it was imported from.
    for (const call of declaration.matchAll(/\b(create\w+)\s*\(/gu)) {
      const factory = call[1];

      if (factory === undefined) {
        continue;
      }

      const importLine = new RegExp(`import\\s*\\{[^}]*\\b${factory}\\b[^}]*\\}\\s*from\\s*'([^']+)'`, 'u').exec(
        moduleSource,
      );

      const factoryPath = importLine?.[1] === undefined ? null : resolveModule(importLine[1], modulePath);

      if (factoryPath !== null) {
        parts.push(readFileSync(factoryPath, 'utf8'));
      }
    }
  }

  return parts.join('\n');
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
