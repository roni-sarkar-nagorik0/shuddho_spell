import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * The real `en` catalogue, so a key the bar asks for that nobody wrote fails
 * here rather than rendering an empty element. Same trick as `/login`'s test.
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

vi.mock('next-intl', async () => {
  const en: unknown = (await import('../../../messages/en.json')).default;
  return {
    useTranslations: (namespace: string) => (key: string) => lookup(en, namespace, key),
  };
});

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));

// The bell owns a fetch and a poll of its own, and neither is what this file is
// about. It is replaced by a marker so the bar still renders the whole row.
vi.mock('@/components/notifications/notification-bell', () => ({
  NotificationBell: () => <span data-testid="bell" />,
}));

const { TopBar } = await import('./top-bar');

describe('the top bar', () => {
  function dom(): HTMLElement {
    return render(<TopBar displayName="Roni Sarkar" streakDays={3} />).container;
  }

  it('offers a way out on every signed-in screen', () => {
    const form = dom().querySelector('form[action="/auth/signout"]');

    expect(form).not.toBeNull();
    expect(form?.getAttribute('method')).toBe('post');
  });

  it('signs out with a button, never a link a prefetch could follow', () => {
    const container = dom();
    const button = container.querySelector('form[action="/auth/signout"] button');

    expect(button?.getAttribute('type')).toBe('submit');
    expect(button?.textContent).toContain('Sign out');
    expect(container.querySelector('a[href="/auth/signout"]')).toBeNull();
  });
});
