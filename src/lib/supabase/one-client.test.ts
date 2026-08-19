// @vitest-environment node
/**
 * F5.1's criterion, as a sweep: **no file outside `src/lib/supabase/`
 * constructs a Supabase client.**
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). This one is a
 * structural rule about the whole tree rather than about any file, which is the
 * one thing a reviewer reliably cannot check and a grep reliably can — the same
 * argument that produced Phase 3's four sweeps (D28).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = 'src';
const ALLOWED_DIR = join('src', 'lib', 'supabase');

function sourceFiles(dir: string): readonly string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }

    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : [];
  });
}

const files = sourceFiles(SRC);

describe('exactly two Supabase clients exist', () => {
  it('constructs a client only inside src/lib/supabase/', () => {
    const offenders = files.filter(
      (path) =>
        !path.startsWith(ALLOWED_DIR) &&
        /\bcreateClient\s*\(|createServerClient\s*\(|createBrowserClient\s*\(/u.test(
          readFileSync(path, 'utf8'),
        ),
    );

    expect(offenders, 'these files construct their own Supabase client').toEqual([]);
  });

  it('names a Supabase type nowhere in src/modules/', () => {
    // A repository that can name SupabaseClient can hold one. The IDatabase
    // seam exists so that none of them needs to.
    const offenders = files.filter(
      (path) =>
        path.startsWith(join('src', 'modules')) &&
        !path.endsWith('.test.ts') &&
        /@supabase\//u.test(readFileSync(path, 'utf8')),
    );

    expect(offenders, 'these module files import from @supabase/*').toEqual([]);
  });
});
