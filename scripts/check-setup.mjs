#!/usr/bin/env node
// Setup doctor. Run `pnpm setup:check` after following the README.
//
// No Docker, no local database stack: ShuddhoSpell talks to a hosted Supabase
// project. This script never reads an env file — it only checks that one exists.
import { existsSync } from 'node:fs';
import process from 'node:process';

/**
 * @typedef {{ name: string, ok: boolean, detail: string }} Check
 */

/** @type {Check[]} */
const results = [];

/**
 * @param {string} name
 * @param {boolean} ok
 * @param {string} detail
 */
function record(name, ok, detail) {
  results.push({ name, ok, detail });
}

const [major, minor] = process.versions.node.split('.').map(Number);
record(
  'Node >= 20.11',
  major > 20 || (major === 20 && minor >= 11),
  `found ${process.versions.node} — install Node 20.11 or newer`,
);

record('dependencies installed', existsSync('node_modules/next'), 'run pnpm install');

const envFile = ['.env.local', '.env'].find((file) => existsSync(file));
record(
  'env file present',
  envFile !== undefined,
  'run cp .env.example .env.local, then fill sections 1 and 2',
);

for (const { name, ok, detail } of results) {
  process.stdout.write(`${ok ? '  ok  ' : ' FAIL '} ${name.padEnd(24)} ${ok ? '' : `→ ${detail}`}\n`);
}

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  process.stdout.write(`\n${String(failed.length)} check(s) failed. See README → Getting started.\n`);
  process.exit(1);
}

process.stdout.write(
  '\nSetup looks complete. Run `pnpm dev`, then check http://localhost:3000/api/ready —\n' +
    'it reports "ok" once the Supabase credentials in your env file reach a real project.\n',
);
