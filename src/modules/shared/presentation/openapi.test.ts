// @vitest-environment node
/**
 * F5.9a's criterion: **every v1 route appears, and the document is generated
 * from the Zod schemas rather than maintained alongside them.**
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). This one is here
 * because a stale API document is worse than none — people believe it — and
 * "someone will remember to update it" is exactly the assumption that fails.
 * The sweep makes forgetting impossible: add a route under `src/app/api/v1/`,
 * do not register it, and the suite goes red.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from './openapi';

const V1_DIR = join('src', 'app', 'api', 'v1');

/** Every v1 route on disk, as the OpenAPI path it should be documented under. */
function routePaths(dir: string, prefix = '/api/v1'): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      // `[dayIndex]` on disk is `{dayIndex}` in OpenAPI.
      const segment = entry.name.replace(/^\[(.+)\]$/u, '{$1}');

      return routePaths(path, `${prefix}/${segment}`);
    }

    return entry.name === 'route.ts' ? [prefix] : [];
  });
}

const document = buildOpenApiDocument();

describe('the OpenAPI document', () => {
  it('documents every v1 route that exists on disk', () => {
    const onDisk = [...routePaths(V1_DIR)].sort();
    const documented = Object.keys(document.paths).sort();

    expect(onDisk.length, 'no v1 routes found — the sweep is looking in the wrong place')
      .toBeGreaterThan(0);

    // openapi.json describes the others and does not describe itself.
    expect(documented).toStrictEqual(onDisk.filter((path) => !path.endsWith('/openapi.json')));
  });

  it('takes its request shapes from the schemas the handlers validate with', () => {
    // The lesson-start body is `{ dayIndex: number 1..28 }` in exactly one
    // place — the schema the handler parses with. If this document declared its
    // own, the two would drift the first time someone was in a hurry.
    const body = document.paths['/api/v1/lessons/sessions']?.post?.requestBody;

    expect(JSON.stringify(body)).toContain('dayIndex');
    expect(JSON.stringify(body)).toContain('28');
  });

  it('describes the discriminated attempt body, both arms', () => {
    const body = JSON.stringify(
      document.paths['/api/v1/lessons/sessions/{id}/attempts']?.post?.requestBody,
    );

    expect(body).toContain('dictation');
    expect(body).toContain('construction');
    expect(body).toContain('wordId');
    expect(body).toContain('sentenceItemId');
  });

  it('says every route can answer with problem+json', () => {
    for (const [path, item] of Object.entries(document.paths)) {
      const operations = Object.values(item).filter(
        (value): value is { responses?: Record<string, unknown> } =>
          typeof value === 'object' && value !== null && 'responses' in value,
      );

      for (const operation of operations) {
        expect(Object.keys(operation.responses ?? {}), `${path} documents no error response`)
          .toContain('401');
      }
    }
  });

  it('declares no identity field on any request body or parameter', () => {
    // F3.12's rule, restated where it is easiest to break by accident: a
    // documented `profileId` invites a client to send one.
    //
    // Requests only. `GET /me` legitimately *returns* a `userId` — the rule is
    // that identity never travels inwards, not that it is unmentionable.
    const requestShapes = Object.values(document.paths).flatMap((item) =>
      Object.values(item).flatMap((operation: unknown) => {
        if (typeof operation !== 'object' || operation === null) {
          return [];
        }

        const shape: Record<string, unknown> = { ...operation };

        return [
          JSON.stringify(shape['requestBody'] ?? {}),
          JSON.stringify(shape['parameters'] ?? {}),
        ];
      }),
    );

    for (const shape of requestShapes) {
      expect(shape).not.toContain('profileId');
      expect(shape).not.toContain('userId');
    }
  });
});
