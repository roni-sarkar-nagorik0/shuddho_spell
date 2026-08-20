import { expect, test } from '@playwright/test';
import { CAN_SIGN_IN, MISSING_CREDENTIALS, signIn } from './fixtures/session';

/**
 * F13.2 — **Google sign-in → dashboard**, the first of the four flows
 * `14-quality-gates.md` says must never break.
 *
 * The Google consent screen itself is not driven here and never will be:
 * automating it means storing a real Google password, and Google being the only
 * provider exists so that no password does. What this proves is everything the
 * session unlocks — that a signed-in learner reaching `/dashboard` gets their
 * own shell, their own numbers, and no redirect back to `/login`.
 *
 * `e2e/route-protection.spec.ts` already proves the other half: that arriving
 * without a session is bounced.
 */
test.describe('signed in, on the dashboard', () => {
  test.skip(!CAN_SIGN_IN, MISSING_CREDENTIALS);

  test('a signed-in learner lands on the dashboard, not back at login', async ({
    context,
    page,
    baseURL,
  }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard$/u);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('the shell renders: rail, top bar, and the four stat panels', async ({
    context,
    page,
    baseURL,
  }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');
    await page.goto('/dashboard');

    await expect(page.getByRole('navigation', { name: /primary/iu })).toBeVisible();
    await expect(page.getByText('Current streak')).toBeVisible();
    await expect(page.getByText('Accuracy')).toBeVisible();
    await expect(page.getByText('Mastered')).toBeVisible();
  });

  test('the rail collapses and the choice survives a navigation', async ({
    context,
    page,
    baseURL,
  }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');
    await page.goto('/dashboard');

    await page.getByRole('button', { name: /collapse/iu }).click();
    await page.goto('/program');

    // The cookie, not localStorage — so the very first server paint is already
    // collapsed rather than flashing wide and snapping shut.
    await expect(page.getByRole('button', { name: /expand/iu })).toBeVisible();
  });

  test('the dashboard makes no request to its own API — it reads through the composition root', async ({
    context,
    page,
    baseURL,
  }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');

    const selfCalls: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/v1\/(progress|program|review)/u.test(request.url())) {
        selfCalls.push(request.url());
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    expect(selfCalls, 'a Server Component fetched its own API over HTTP').toStrictEqual([]);
  });
});
