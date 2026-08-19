import { expect, test } from '@playwright/test';

test('the sign-in page is one heading, one line and one button', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in.');
  await expect(page.locator('button')).toHaveCount(1);
  await expect(page.locator('input')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

test('the button hands the learner to Google, through Supabase', async ({ page, baseURL }) => {
  await page.goto('/login');

  // Stop at the redirect rather than following it out to Google's servers.
  const response = await page.request.post(`${baseURL ?? ''}/auth/signin`, { maxRedirects: 0 });

  expect(response.status()).toBe(303);
  const location = response.headers()['location'] ?? '';
  expect(location).toContain('/auth/v1/authorize');
  expect(location).toContain('provider=google');
});
