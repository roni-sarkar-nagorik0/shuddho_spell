/**
 * Key parity between `messages/en.json` and `messages/bn.json`.
 *
 * `12-design-system.md`: "CI fails on any key present in `en` and missing in
 * `bn`." A missing key is not a cosmetic defect — `next-intl` throws on a
 * lookup it cannot resolve, so a Bangla-reading learner gets an error boundary
 * where a sentence should be, on whichever screen nobody translated.
 *
 * Three checks, not one:
 *   1. every `en` key exists in `bn`
 *   2. every `bn` key exists in `en` — an orphan is a key somebody renamed on
 *      one side, and it hides the missing translation it used to be
 *   3. the ICU placeholders match — `{day}` in `en` and `{din}` in `bn` passes
 *      a key check and throws at render, which is the worst of both
 *
 * Run by `pnpm i18n:check` and by `prebuild`, so it fails the build the same
 * way `content:validate` does, with or without a CI workflow in front of it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES = ['en', 'bn'] as const;

type Catalogue = Record<string, unknown>;

function load(locale: string): Catalogue {
  const path = resolve(process.cwd(), 'messages', `${locale}.json`);
  return JSON.parse(readFileSync(path, 'utf8')) as Catalogue;
}

/** Dotted paths of every leaf. Objects are structure; only leaves are text. */
function flatten(value: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();

  if (typeof value === 'string') {
    out.set(prefix, value);
    return out;
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return out;
  }

  for (const [key, child] of Object.entries(value)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    for (const [leaf, text] of flatten(child, path)) {
      out.set(leaf, text);
    }
  }

  return out;
}

/** `{name}` and `{count, plural, ...}` alike — the argument name is what has to match. */
function placeholders(text: string): readonly string[] {
  return [...text.matchAll(/\{\s*([a-zA-Z0-9_]+)/g)]
    .map((match) => match[1] ?? '')
    .sort((a, b) => a.localeCompare(b));
}

const [en, bn] = LOCALES.map((locale) => flatten(load(locale)));

if (en === undefined || bn === undefined) {
  throw new Error('both catalogues must load');
}

const missing = [...en.keys()].filter((key) => !bn.has(key)).sort((a, b) => a.localeCompare(b));
const orphaned = [...bn.keys()].filter((key) => !en.has(key)).sort((a, b) => a.localeCompare(b));

const mismatched = [...en.entries()]
  .flatMap(([key, text]) => {
    const other = bn.get(key);
    if (other === undefined) {
      return [];
    }

    const left = placeholders(text).join(', ');
    const right = placeholders(other).join(', ');

    return left === right ? [] : [{ key, left, right }];
  })
  .sort((a, b) => a.key.localeCompare(b.key));

for (const key of missing) {
  process.stderr.write(`missing in bn: ${key}\n`);
}
for (const key of orphaned) {
  process.stderr.write(`present in bn, absent from en: ${key}\n`);
}
for (const entry of mismatched) {
  process.stderr.write(
    `placeholders differ at ${entry.key}: en has {${entry.left}}, bn has {${entry.right}}\n`,
  );
}

const failures = missing.length + orphaned.length + mismatched.length;

if (failures > 0) {
  process.stderr.write(`\ni18n check failed: ${String(failures)} problem(s).\n`);
  process.exit(1);
}

process.stdout.write(`i18n check passed: ${String(en.size)} keys, en and bn in parity.\n`);
