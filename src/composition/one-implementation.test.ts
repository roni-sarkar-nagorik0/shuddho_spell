// @vitest-environment node
/**
 * F5.8's criterion: **the Server Component read path and the handler path run
 * the same use case, not two implementations.**
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). This one is a
 * structural rule about the whole tree, which is the kind a reviewer cannot
 * reliably check and a sweep can — the same argument as Phase 3's four sweeps
 * (D28). Two implementations that agree on the day they are written is the
 * normal way this goes wrong, and it is invisible until they disagree.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function filesUnder(dir: string): readonly string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      return filesUnder(path);
    }

    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : [];
  });
}

const appFiles = filesUnder(join('src', 'app'));

describe('one implementation, two callers', () => {
  it('no Server Component fetches this app’s own API over HTTP', () => {
    const offenders = appFiles
      .filter((path) => !path.endsWith('route.ts') && !path.includes('.test.'))
      .filter((path) => /fetch\(\s*[`'"]\/api\//u.test(readFileSync(path, 'utf8')));

    expect(
      offenders,
      'these pages fetch their own API — call the use case through the composition root instead',
    ).toEqual([]);
  });

  it('the dashboard page and the progress endpoint share a use-case factory', () => {
    const reads = readFileSync(join('src', 'composition', 'reads.ts'), 'utf8');
    const handlers = readFileSync(join('src', 'composition', 'handlers.ts'), 'utf8');

    // Both import their use cases from the same factory module. If a page ever
    // constructed a use case itself, or a second factory appeared, this is what
    // notices.
    expect(reads).toMatch(/from '\.\/use-cases'/u);
    expect(handlers).toMatch(/from '\.\/use-cases'/u);
    expect(reads).toMatch(/makeGetProgressSummary/u);
    expect(handlers).toMatch(/makeGetProgressSummary/u);
  });

  it('no page constructs a use case directly', () => {
    // `new SomethingUseCase(...)` in src/app means the wiring was bypassed and
    // the page now has its own opinion about the dependencies.
    const offenders = appFiles.filter((path) =>
      /new\s+\w+UseCase\s*\(/u.test(readFileSync(path, 'utf8')),
    );

    expect(offenders, 'these pages build their own use case instead of using the root').toEqual([]);
  });

  it('no page imports a repository or an adapter', () => {
    const offenders = appFiles.filter((path) =>
      /from '@\/modules\/[^']*\/(infrastructure|domain)\//u.test(readFileSync(path, 'utf8')),
    );

    expect(offenders, 'src/app may import presentation, composition, contracts and lib only').toEqual(
      [],
    );
  });
});
