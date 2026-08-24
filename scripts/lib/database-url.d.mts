/**
 * Types for `database-url.mjs`, written by hand because the module is JavaScript
 * and `content-seed.ts` imports it. `tsconfig.json` compiles `**\/*.ts` only —
 * turning `allowJs` on for one file would put every script's JavaScript under
 * the compiler, which is a larger decision than this import needs.
 */
import type pg from 'pg';

export declare function normaliseDatabaseUrl(raw: string): string;

export declare function connectDatabase(connectionString: string): Promise<pg.Client>;

export declare const UNREACHABLE_HELP: string;
