import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { PROBLEM_CODES } from '@/contracts';
import { apiFetch, apiRequest } from './client';
import { ApiError } from './problem';

const wordSchema = z.object({
  id: z.string(),
  headword: z.string(),
  syllables: z.number(),
});

const META = { requestId: 'req-1', timestamp: '2026-08-18T00:00:00.000Z' };

function jsonResponse(body: unknown, init: { status?: number; type?: string } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': init.type ?? 'application/json' },
  });
}

function stubFetch(impl: (url: string, init?: RequestInit) => Promise<Response> | Response): void {
  vi.stubGlobal('fetch', vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('returns the validated data for a well-formed response', async () => {
    stubFetch(() => jsonResponse({ data: { id: 'w1', headword: 'beautiful', syllables: 3 }, meta: META }));

    const word = await apiFetch('/api/v1/library/words/w1', { schema: wordSchema });

    expect(word).toEqual({ id: 'w1', headword: 'beautiful', syllables: 3 });
  });

  it('throws ApiError — not a render crash — when the payload does not match the schema', async () => {
    stubFetch(() => jsonResponse({ data: { id: 'w1', headword: 'beautiful', syllables: '3' }, meta: META }));

    const thrown = await apiFetch('/api/v1/library/words/w1', { schema: wordSchema }).catch(
      (error: unknown) => error,
    );

    expect(thrown).toBeInstanceOf(ApiError);
    if (!(thrown instanceof ApiError)) {
      throw new Error('expected an ApiError');
    }
    expect(thrown.code).toBe(PROBLEM_CODES.INTERNAL);
    expect(thrown.message).toContain('does not match its contract');
    expect(thrown.fieldErrors).toEqual([
      { field: 'syllables', message: 'Expected number, received string' },
    ]);
  });

  it('throws ApiError when the envelope itself is missing', async () => {
    stubFetch(() => jsonResponse({ id: 'w1', headword: 'beautiful', syllables: 3 }));

    await expect(apiFetch('/api/v1/library/words/w1', { schema: wordSchema })).rejects.toThrow(
      /did not return the \{ data, meta \} envelope/,
    );
  });

  it('maps a problem+json error body onto ApiError', async () => {
    stubFetch(() =>
      jsonResponse(
        {
          type: 'https://shuddhospell.app/problems/validation-failed',
          title: 'Validation failed',
          status: 422,
          detail: 'headword is required.',
          instance: '/api/v1/library/words',
          code: 'VALIDATION_FAILED',
          requestId: 'req-2',
          errors: [{ field: 'headword', message: 'Required' }],
        },
        { status: 422, type: 'application/problem+json' },
      ),
    );

    const thrown = await apiFetch('/api/v1/library/words', {
      schema: wordSchema,
      method: 'POST',
      body: {},
    }).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ApiError);
    if (!(thrown instanceof ApiError)) {
      throw new Error('expected an ApiError');
    }
    expect(thrown.status).toBe(422);
    expect(thrown.code).toBe(PROBLEM_CODES.VALIDATION_FAILED);
    expect(thrown.message).toBe('headword is required.');
    expect(thrown.fieldErrors).toEqual([{ field: 'headword', message: 'Required' }]);
  });

  it('throws ApiError when an error response is not problem+json (an HTML error page)', async () => {
    stubFetch(
      () => new Response('<!doctype html><h1>502</h1>', { status: 502, headers: { 'content-type': 'text/html' } }),
    );

    const thrown = await apiFetch('/api/v1/program', { schema: wordSchema }).catch(
      (error: unknown) => error,
    );

    expect(thrown).toBeInstanceOf(ApiError);
    if (!(thrown instanceof ApiError)) {
      throw new Error('expected an ApiError');
    }
    expect(thrown.status).toBe(502);
    expect(thrown.code).toBe(PROBLEM_CODES.INTERNAL);
  });

  it('turns a network failure into ApiError', async () => {
    stubFetch(() => Promise.reject(new Error('Failed to fetch')));

    await expect(apiFetch('/api/v1/program', { schema: wordSchema })).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('builds the query string and skips undefined values', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return jsonResponse({ data: [], meta: META });
    });

    await apiFetch('/api/v1/library/words', {
      schema: z.array(wordSchema),
      query: { page: 2, mastered: true, cursor: undefined },
    });

    expect(seenUrl).toBe('/api/v1/library/words?page=2&mastered=true');
  });

  it('sends JSON with a content-type only when there is a body', async () => {
    const calls: RequestInit[] = [];
    stubFetch((_url, init) => {
      calls.push(init ?? {});
      return jsonResponse({ data: { id: 'w1', headword: 'beautiful', syllables: 3 }, meta: META });
    });

    await apiFetch('/api/v1/lessons/sessions', {
      schema: wordSchema,
      method: 'POST',
      body: { dayIndex: 4 },
    });
    await apiFetch('/api/v1/library/words/w1', { schema: wordSchema });

    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.body).toBe('{"dayIndex":4}');
    expect(calls[0]?.headers).toEqual({ 'content-type': 'application/json' });
    expect(calls[1]?.method).toBe('GET');
    expect(calls[1]?.body).toBeUndefined();
  });

  it('exposes meta through apiRequest', async () => {
    stubFetch(() => jsonResponse({ data: { id: 'w1', headword: 'beautiful', syllables: 3 }, meta: META }));

    const result = await apiRequest('/api/v1/library/words/w1', { schema: wordSchema });

    expect(result.meta.requestId).toBe('req-1');
  });

  it('prefixes baseUrl when one is given', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return jsonResponse({ data: null, meta: META });
    });

    await apiFetch('/api/health', { schema: z.null(), baseUrl: 'http://localhost:3311' });

    expect(seenUrl).toBe('http://localhost:3311/api/health');
  });
});
