import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guards the documented setup path (F1.16). A README that drifts from the scripts, the env
 * file or the no-Docker rule is a broken clean checkout, and nobody finds out until someone
 * tries to onboard.
 */

const readme = readFileSync('README.md', 'utf8');
const envExample = readFileSync('.env.example', 'utf8');

/** Variables a checkout must fill before the app boots — sections 1 and 2 of `.env.example`. */
const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
];

function fencedCommands(markdown: string): readonly string[] {
  const blocks = markdown.matchAll(/```bash\n([\s\S]*?)```/g);
  return [...blocks].flatMap((block) =>
    (block[1] ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#')),
  );
}

describe('documented setup', () => {
  it('names every variable the app validates at boot', () => {
    for (const name of REQUIRED_ENV_VARS) {
      expect(envExample, `${name} missing from .env.example`).toContain(`${name}=`);
      expect(readme, `${name} missing from the README setup table`).toContain(name);
    }
  });

  it('declares every env variable read by the Zod schemas', () => {
    const publicSource = readFileSync('src/lib/env.public.ts', 'utf8');
    const serverSource = readFileSync('src/lib/env.server.ts', 'utf8');
    const read = [...`${publicSource}${serverSource}`.matchAll(/process\.env\['([A-Z0-9_]+)'\]/g)].map(
      (match) => match[1],
    );

    expect(read.length).toBeGreaterThan(0);
    for (const name of new Set(read)) {
      const variable = name ?? '';
      expect(envExample, `${variable} is read but not documented in .env.example`).toContain(
        variable,
      );
    }
  });

  it('only tells the reader to run scripts that exist', () => {
    const scriptsBlock: unknown = JSON.parse(readFileSync('package.json', 'utf8'));
    const scripts =
      typeof scriptsBlock === 'object' && scriptsBlock !== null && 'scripts' in scriptsBlock
        ? scriptsBlock.scripts
        : {};
    const known = Object.keys(scripts ?? {});

    const referenced = fencedCommands(readme)
      .map((line) => line.replace(/^[A-Z_]+=\S+\s+/, ''))
      .filter((line) => line.startsWith('pnpm '))
      .map((line) => line.split(/\s+/)[1] ?? '')
      .filter((name) => name !== 'install' && name !== 'dlx');

    expect(referenced.length).toBeGreaterThan(3);
    for (const name of referenced) {
      expect(known, `README runs "pnpm ${name}" but package.json has no such script`).toContain(
        name,
      );
    }
  });

  it('keeps Docker and a local database stack out of the setup', () => {
    const banned = /docker|docker-compose|supabase start|supabase stop|127\.0\.0\.1:5432\d/i;
    // A file may name Docker only to say the project does not use it.
    const denial = /\bno docker\b/i;
    const files: readonly string[] = [
      '.env.example',
      'README.md',
      'package.json',
      'scripts/check-setup.mjs',
    ];

    for (const file of files) {
      const offending = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => banned.test(line) && !denial.test(line));

      expect(offending, `${file} still refers to a local Docker stack`).toEqual([]);
    }
  });
});
