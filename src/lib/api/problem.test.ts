import { describe, expect, it } from 'vitest';
import { PROBLEM_CODES } from '@/contracts';
import { ApiError, problem } from './problem';

describe('problem()', () => {
  const base = {
    status: 404,
    code: PROBLEM_CODES.NOT_FOUND,
    title: 'Not found',
    detail: 'No such lesson.',
    instance: '/api/v1/lessons/9',
    requestId: 'req-1',
  } as const;

  it('derives a stable type URI from the code', () => {
    expect(problem(base).type).toBe('https://shuddhospell.app/problems/not-found');
  });

  it('omits `errors` entirely when there are none', () => {
    expect('errors' in problem(base)).toBe(false);
  });

  it('carries field errors through when given', () => {
    const withErrors = problem({ ...base, errors: [{ field: 'day', message: 'Too large' }] });
    expect(withErrors.errors).toHaveLength(1);
  });
});

describe('ApiError', () => {
  it('notFound names the missing thing and is a 404', () => {
    const error = ApiError.notFound('Lesson 9');
    expect(error.status).toBe(404);
    expect(error.code).toBe(PROBLEM_CODES.NOT_FOUND);
    expect(error.message).toBe('Lesson 9 was not found.');
  });

  it('unauthenticated is a 401', () => {
    expect(ApiError.unauthenticated().status).toBe(401);
  });

  it('forbidden is a 403', () => {
    expect(ApiError.forbidden().status).toBe(403);
  });
});
