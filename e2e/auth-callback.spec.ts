import { expect, test } from '@playwright/test';

/**
 * The happy path needs Google, so it is not an e2e test — the unit tests drive
 * the exchange with a fake. What is worth proving against the real build is the
 * refusal path, because that is the one a learner reaches by pressing cancel,
 * and it must land on a page that exists rather than on a stack trace.
 */
test('a callback with no code returns the learner to the login page', async ({ page, baseURL }) => {
  const response = await page.request.get(`${baseURL ?? ''}/auth/callback`, { maxRedirects: 0 });

  expect(response.status()).toBe(303);
  expect(response.headers()['location'] ?? '').toContain('/login?error=google');
});

test('cancelling at the consent screen says so on the login page', async ({ page }) => {
  await page.goto('/auth/callback?error=access_denied');

  await expect(page).toHaveURL(/\/login\?error=google$/u);
  // The role matters — the failure has to reach a screen reader, not just the
  // screen. Two things carry it though: our line and Next's own route
  // announcer, and a `<p>` takes no accessible name from its text, so the
  // message has to narrow it by content.
  const alert = page.getByRole('alert').filter({ hasText: 'Google sign-in could not start' });
  await expect(alert).toBeVisible();
});
