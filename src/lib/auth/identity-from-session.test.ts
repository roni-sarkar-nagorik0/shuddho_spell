// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * F3.12 — "identity always comes from the server-verified session, never from
 * the client body" (`04-authentication.md`).
 *
 * The individual endpoints already prove their own half of this: `/api/v1/me`
 * ignores a `userId` in the query, `/auth/callback` ignores one too, and
 * `withApi` is the only thing that can put a user into a handler. What was
 * missing is the rule itself, stated once and checked over the whole tree, so
 * that the next endpoint inherits it instead of having to remember it.
 *
 * **This starts nearly vacuous, and that is worth saying out loud.** No v1
 * request schema exists yet — Phase 5 writes the first one — so today these
 * sweeps confirm an absence rather than catch anything. They earn their keep
 * from the first body schema onward, which is exactly when the mistake becomes
 * possible and also when nobody is thinking about it.
 */

const IDENTITY_FIELDS: readonly string[] = ['userId', 'profileId', 'user_id', 'profile_id'];

function sourceFiles(directory: string, suffix = /\.tsx?$/u): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path, suffix);
    if (!suffix.test(entry.name) || entry.name.includes('.test.')) return [];
    return [path];
  });
}

/** Everything a client can put on the wire: request DTOs and query schemas. */
function requestSchemaFiles(): readonly string[] {
  return sourceFiles('src').filter(
    (path) => path.includes(join('presentation', 'dto')) && !path.includes('.response.'),
  );
}

describe('a client cannot name a learner', () => {
  it('declares no identity field in any request schema', () => {
    const offending = requestSchemaFiles().filter((path) => {
      const source = readFileSync(path, 'utf8');
      return IDENTITY_FIELDS.some((field) => new RegExp(`\\b${field}\\s*:`, 'u').test(source));
    });

    expect(
      offending,
      'a request schema accepts an id — the session is the only place one may come from',
    ).toStrictEqual([]);
  });

  it('reads no identity out of a url in any route or handler', () => {
    // `searchParams.get('userId')` is the shape this is aimed at. A route may
    // read the url for anything else; it may not read who is asking.
    const offending = sourceFiles('src').filter((path) => {
      const source = readFileSync(path, 'utf8');
      return IDENTITY_FIELDS.some((field) =>
        new RegExp(`(searchParams|params)[^\\n]*['"\`]${field}['"\`]`, 'u').test(source),
      );
    });

    expect(offending).toStrictEqual([]);
  });

  it('lets nothing but withApi and requireUser produce an authenticated user', () => {
    // The object itself. If a second place can build one, the guarantee that it
    // came from a verified session is only a convention.
    const builders = sourceFiles('src').filter((path) => {
      const source = readFileSync(path, 'utf8');
      return /:\s*IAuthenticatedUser\s*=|IAuthenticatedUser\s*=\s*\{/u.test(source);
    });

    expect(builders).toStrictEqual([]);
  });
});

describe('the use cases take their ids from above, not from the wire', () => {
  it('gives every use case input a userId the caller cannot have invented', () => {
    // A use case *should* take a userId — `withApi` injects it. What must never
    // happen is a use case input being built straight from a parsed body.
    const handlers = sourceFiles('src').filter((path) =>
      path.includes(join('presentation', 'handlers')),
    );

    expect(handlers.length, 'no handlers to check yet').toBeGreaterThan(0);

    for (const path of handlers) {
      const source = readFileSync(path, 'utf8');
      for (const field of IDENTITY_FIELDS) {
        expect(
          source,
          `${path} takes ${field} from the request body`,
        ).not.toMatch(new RegExp(`${field}:\\s*body\\.`, 'u'));
        expect(
          source,
          `${path} takes ${field} from the query string`,
        ).not.toMatch(new RegExp(`${field}:\\s*query\\.`, 'u'));
      }
    }
  });

  it('spreads no request body into a use case input', () => {
    // `execute({ ...body, userId: user.userId })` is the one that looks safe
    // and is not: a body carrying its own userId wins if the order slips, and
    // the order is one careless edit away.
    const handlers = sourceFiles('src').filter((path) =>
      path.includes(join('presentation', 'handlers')),
    );

    for (const path of handlers) {
      expect(readFileSync(path, 'utf8'), `${path} spreads a request body`).not.toMatch(
        /execute\(\{\s*\.\.\.(body|query)/u,
      );
    }
  });
});
