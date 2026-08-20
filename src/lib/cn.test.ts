import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn()', () => {
  it('lets the later Tailwind class win instead of emitting both', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('drops falsy values', () => {
    expect(cn('card', false, undefined, 'card-accent')).toBe('card card-accent');
  });
});
