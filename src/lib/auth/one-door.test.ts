// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * F3.11, and the exit gate's own words:
 *
 *     grep -ri "password\|magic.link\|signInWithOtp" src/
 *
 * must return nothing. Run as a test rather than by hand, because a rule that
 * only holds when somebody remembers to check it is not a rule. Google is the
 * only door (`04-authentication.md`), and the way that stays true is that a
 * password field cannot be added without this failing first.
 *
 * The sweep covers test files too. A test that types a password into a form is
 * a form that accepts one.
 */

const BANNED: readonly RegExp[] = [
  new RegExp(['pass', 'word'].join(''), 'iu'),
  new RegExp(['magic', '.', 'link'].join(''), 'iu'),
  new RegExp(['signIn', 'WithOtp'].join(''), 'iu'),
];

/** This file names the banned words to look for them; it cannot sweep itself. */
const SELF = 'one-door.test.ts';

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.(ts|tsx|css)$/u.test(entry.name)) return [];
    return entry.name === SELF ? [] : [path];
  });
}

interface IHit {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

function hits(): readonly IHit[] {
  return sourceFiles('src').flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .map((text, index) => ({ file, line: index + 1, text: text.trim() }))
      .filter((row) => BANNED.some((pattern) => pattern.test(row.text))),
  );
}

describe('no email/password path exists', () => {
  it('sweeps a tree that is actually there', () => {
    expect(sourceFiles('src').length).toBeGreaterThan(20);
  });

  it('mentions no password, magic link or OTP anywhere in src', () => {
    expect(hits()).toStrictEqual([]);
  });

  it('carries no input element outside the ones a lesson needs', () => {
    // The sign-in screen is one heading, one line, one button. `/login` is
    // covered structurally by its own test; this catches a field appearing on
    // any other page that could plausibly be an auth form.
    const offending = sourceFiles('src').filter((file) => {
      if (!file.startsWith(join('src', 'app'))) return false;
      const source = readFileSync(file, 'utf8');
      return /<input\b/u.test(source) && /type=["']email["']/u.test(source);
    });

    expect(offending).toStrictEqual([]);
  });
});
