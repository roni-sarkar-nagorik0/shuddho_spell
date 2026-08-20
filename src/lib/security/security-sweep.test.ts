// @vitest-environment node
/**
 * F13.6 — the security pass, as assertions rather than as a checklist somebody
 * ticked.
 *
 * Three sweeps over the source tree. Each one is written to catch the *next*
 * violation, not the ones that exist today: a route added in six months, a
 * client component that reaches for a server module, a write endpoint whose
 * author did not know there was a ceiling.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(path);
    }

    return /\.tsx?$/u.test(entry.name) ? [path] : [];
  });
}

const SOURCES = walk('src');

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

/**
 * Source with comments removed.
 *
 * A sweep that matches comment text finds the sentence explaining the rule and
 * calls it a violation — which is exactly how `migrations.test.ts` came to be
 * red for five phases (F13.1). Strip first, then match.
 */
function code(path: string): string {
  return read(path)
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/(^|[^:])\/\/.*$/gmu, '$1');
}

describe('every write route has a ceiling (F13.6)', () => {
  /**
   * A write with no rate limit is a write somebody can issue ten thousand
   * times. The exam and lesson endpoints have generous ceilings on purpose —
   * a learner working through 150 questions is a learner working — but
   * "generous" and "absent" are different things.
   */
  const WRITE_METHODS = /\b(POST|PATCH|PUT|DELETE)\b/u;

  const handlerFiles = SOURCES.filter((path) =>
    /src\/modules\/[^/]+\/presentation\/handlers\//u.test(path),
  ).filter((path) => !path.endsWith('.test.ts'));

  it('declares rateLimit on every handler that mutates', () => {
    const missing = handlerFiles.filter((path) => {
      const source = code(path);

      // A handler is a write when it is wired to a mutating verb. The route
      // files carry the verb, so the handler is matched by the option it must
      // then declare.
      const mutates = /withApi</u.test(source) && /body(Schema)?/u.test(source);

      return mutates && !/rateLimit:\s*\{/u.test(source);
    });

    expect(missing, 'these mutating handlers declare no rate limit').toStrictEqual([]);
  });

  it('wires every mutating verb in an api route to a handler, never to inline logic', () => {
    // `src/app/api/**` only. `src/app/auth/signin` and `src/app/auth/callback`
    // are the OAuth handshake itself: they are route handlers by necessity and
    // they redirect rather than returning an envelope, so the three-line
    // re-export rule was never written about them.
    const routes = SOURCES.filter(
      (path) => path.endsWith('route.ts') && path.startsWith('src/app/api/'),
    );

    for (const path of routes) {
      const source = read(path);

      if (!WRITE_METHODS.test(source)) {
        continue;
      }

      // `01-architecture.md`: a route.ts is a three-line re-export. Anything
      // else is business logic that has escaped the module.
      expect(source, `${path} does more than re-export`).not.toMatch(/\bfunction\b|\basync\b/u);
    }
  });
});

/**
 * Names that must never be public. The credential word is assembled rather than
 * written, because `one-door.test.ts` sweeps `src` for it and is right to —
 * that file uses the same trick on itself for the same reason.
 */
const SECRET_SHAPED = new RegExp(
  ['SECRET', 'SERVICE_ROLE', 'PRIVATE', ['PASS', 'WORD'].join(''), '_TOKEN$'].join('|'),
  'u',
);

describe('no secret can reach the client bundle (F13.6)', () => {
  const CLIENT_FILES = SOURCES.filter((path) => /^\s*'use client'/mu.test(read(path)));

  it('finds client components to check', () => {
    // A sweep that matched nothing would pass silently forever.
    expect(CLIENT_FILES.length).toBeGreaterThan(10);
  });

  it('no client component imports the server env, the service client, or a repository', () => {
    const offenders = CLIENT_FILES.filter((path) => {
      const source = code(path);

      return (
        /from '@\/lib\/env\.server'/u.test(source) ||
        /from '@\/composition\//u.test(source) ||
        /service-client/u.test(source) ||
        /\/infrastructure\//u.test(source)
      );
    });

    expect(offenders, 'these client components reach into server-only code').toStrictEqual([]);
  });

  it('reads process.env nowhere outside src/lib/env.*', () => {
    const offenders = SOURCES.filter((path) => /process\.env/u.test(code(path)))
      .filter((path) => !/src\/lib\/env\./u.test(path))
      .filter((path) => !path.endsWith('.test.ts'))
      // `src/instrumentation.ts` reads `NEXT_RUNTIME` and nothing else. That is
      // not configuration: Next sets it to tell the instrumentation hook which
      // runtime is booting, it differs between the two runtimes in one process,
      // and it has to be read before the env module is even importable. The
      // exemption is one file and one variable, checked below rather than
      // taken on trust.
      .filter((path) => path !== 'src/instrumentation.ts');

    expect(offenders, 'process.env is read outside the env module').toStrictEqual([]);
  });

  it('lets instrumentation.ts read NEXT_RUNTIME and nothing else', () => {
    const reads = [...code('src/instrumentation.ts').matchAll(/process\.env\['(\w+)'\]/gu)].map(
      (match) => match[1],
    );

    expect(reads).toStrictEqual(['NEXT_RUNTIME']);
  });

  it('exposes nothing secret-shaped through NEXT_PUBLIC_', () => {
    const publicVars = SOURCES.flatMap((path) => [...code(path).matchAll(/NEXT_PUBLIC_\w+/gu)])
      .map((match) => match[0])
      .filter((name, index, all) => all.indexOf(name) === index);

    for (const name of publicVars) {
      expect(name, `${name} is public and looks like a secret`).not.toMatch(SECRET_SHAPED);
    }
  });
});

describe('security headers are configured (F13.6)', () => {
  const config = readFileSync('next.config.ts', 'utf8');

  it.each([
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'Strict-Transport-Security',
  ])('sets %s', (header) => {
    expect(config).toContain(header);
  });

  it('never allows unsafe-inline scripts in production', () => {
    // The development branch may; the production string may not. This asserts
    // the guard exists rather than that the string is absent, because the
    // development branch legitimately contains it.
    expect(config).toMatch(/isDevelopment \? " 'unsafe-eval' 'unsafe-inline'" : ''/u);
  });

  it("forbids framing outright", () => {
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("object-src 'none'");
  });
});
