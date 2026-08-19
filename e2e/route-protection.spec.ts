import { expect, test } from '@playwright/test';

/**
 * F3.4 against the real build, where the middleware actually runs. The unit
 * tests drive `middleware()` directly; only this proves Next is wired to call
 * it, and that the matcher it exports covers what it claims to.
 */
test('an unauthenticated request for the dashboard is sent to the login page', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/u);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in.');
});

test('the public pages stay open', async ({ page, baseURL }) => {
  for (const path of ['/', '/login']) {
    const response = await page.request.get(`${baseURL ?? ''}${path}`, { maxRedirects: 0 });

    expect(response.status(), `${path} did not answer directly`).toBe(200);
  }
});

test('an api route answers rather than redirecting — a redirect is not an error a caller can read', async ({
  page,
  baseURL,
}) => {
  const response = await page.request.get(`${baseURL ?? ''}/api/health`, { maxRedirects: 0 });

  expect(response.status()).toBe(200);
});

test('the me endpoint answers 401 problem+json to a stranger, not a redirect', async ({
  page,
  baseURL,
}) => {
  const response = await page.request.get(`${baseURL ?? ''}/api/v1/me`, { maxRedirects: 0 });

  expect(response.status()).toBe(401);
  expect(response.headers()['content-type']).toContain('application/problem+json');

  const body: unknown = await response.json();
  expect(body).toMatchObject({ code: 'UNAUTHENTICATED' });
});
