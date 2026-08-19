import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Reads the real `en` catalogue rather than echoing the key back, so a key the
 * page asks for that nobody ever wrote is a failing test, not a blank element.
 */
function lookup(catalogue: unknown, namespace: string, key: string): string {
  if (typeof catalogue !== 'object' || catalogue === null) {
    throw new Error('the en catalogue did not load');
  }
  const section: unknown = Reflect.get(catalogue, namespace);
  if (typeof section !== 'object' || section === null) {
    throw new Error(`the en catalogue has no "${namespace}" namespace`);
  }
  const value: unknown = Reflect.get(section, key);
  if (typeof value !== 'string') {
    throw new Error(`the en catalogue is missing "${namespace}.${key}"`);
  }
  return value;
}

vi.mock('next-intl/server', async () => {
  const en: unknown = (await import('../../../messages/en.json')).default;
  return {
    getTranslations: (namespace: string) =>
      Promise.resolve((key: string) => lookup(en, namespace, key)),
  };
});

const { default: LoginPage } = await import('./page');

describe('/login', () => {
  async function container(query: Record<string, string> = {}): Promise<HTMLElement> {
    const page = await LoginPage({ searchParams: Promise.resolve(query) });
    return render(page).container;
  }

  it('carries exactly one button and not a single input', async () => {
    const dom = await container();

    expect(dom.querySelectorAll('button')).toHaveLength(1);
    expect(dom.querySelectorAll('input')).toHaveLength(0);
    expect(dom.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('the one button is the Google button, and it posts to the sign-in route', async () => {
    const dom = await container();
    const button = dom.querySelector('button');
    const form = dom.querySelector('form');

    expect(button?.textContent).toBe('Continue with Google');
    expect(button?.getAttribute('type')).toBe('submit');
    expect(form?.getAttribute('action')).toBe('/auth/signin');
    expect(form?.getAttribute('method')).toBe('post');
  });

  it('states the promise once, in one heading and one line', async () => {
    const dom = await container();

    expect(dom.querySelectorAll('h1')).toHaveLength(1);
    expect(dom.querySelector('h1')?.textContent).toBe('Sign in.');
  });

  // Deliberately structural rather than a word search: a field or a second
  // provider cannot be added without adding an interactive element, and a grep
  // for the banned words in `src/` is F3.11's job, not this test's to pollute.
  it('offers exactly one way in — no field, no link, no second provider', async () => {
    const dom = await container();

    expect(dom.querySelectorAll('button, a, input, select, textarea')).toHaveLength(1);
  });

  it('stays quiet about failure until one has actually happened', async () => {
    const dom = await container();

    expect(dom.querySelector('[role="alert"]')).toBeNull();
  });

  it('names the failure when the sign-in route bounced the learner back', async () => {
    const dom = await container({ error: 'google' });

    expect(dom.querySelector('[role="alert"]')?.textContent).toBe(
      'Google sign-in could not start. Try again.',
    );
    expect(dom.querySelectorAll('button')).toHaveLength(1);
  });
});
