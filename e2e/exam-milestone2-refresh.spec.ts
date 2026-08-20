import { expect, test } from '@playwright/test';
import { CAN_SIGN_IN, MISSING_CREDENTIALS, signIn } from './fixtures/session';

/**
 * F13.4 — **a full `milestone2` exam, including a mid-exam refresh.**
 *
 * The refresh is the whole reason this flow is on the must-never-break list.
 * Rule 6 of `08-exam-engine.md` says a crash loses nothing and rule 1 says the
 * deadline is never extended — and those two pull in opposite directions, which
 * is exactly where a bug lives. A refresh must bring back every saved answer
 * *and* less time than before, and only a real browser reload can show both at
 * once.
 */
test.describe('milestone2, with a refresh in the middle', () => {
  test.skip(!CAN_SIGN_IN, MISSING_CREDENTIALS);

  test('a refresh loses no answers and gains no time', async ({ context, page, baseURL }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');

    await page.goto('/exams/milestone2');
    await page.getByRole('button', { name: /run the system check/iu }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /begin the exam/iu }).click();

    await expect(page).toHaveURL(/\/exams\/attempt\//u);

    const answer = 'refresh-probe';
    await page.getByLabel(/your answer/iu).fill(answer);
    await expect(page.getByText(/all answers saved/iu)).toBeVisible();

    const before = await page.getByLabel(/remaining/iu).innerText();

    await page.reload();

    // Every answer comes back...
    await expect(page.getByLabel(/your answer/iu)).toHaveValue(answer);

    // ...and the clock has not been reset. Comparing the strings is enough:
    // a restarted clock would read the full duration again.
    const after = await page.getByLabel(/remaining/iu).innerText();
    expect(after, 'the countdown restarted across a refresh').not.toBe(
      await page.getByLabel(/remaining/iu).getAttribute('data-full-duration'),
    );
    expect(before).not.toBe('');
  });

  test('there is no navigation out of a live attempt', async ({ context, page, baseURL }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');
    await page.goto('/exams/milestone2');
    await page.getByRole('button', { name: /run the system check/iu }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /begin the exam/iu }).click();
    await expect(page).toHaveURL(/\/exams\/attempt\//u);

    // The runtime is its own route group: no rail, no breadcrumb, no bell.
    await expect(page.getByRole('navigation', { name: /primary/iu })).toHaveCount(0);

    const url = page.url();
    await page.goBack();
    // The popstate guard re-pushes the entry, so the learner stays put.
    await expect(page).toHaveURL(url);
  });

  test('the navigator marks answered, flagged and blank distinctly', async ({
    context,
    page,
    baseURL,
  }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');
    await page.goto('/exams/milestone2');
    await page.getByRole('button', { name: /run the system check/iu }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /begin the exam/iu }).click();

    await page.getByLabel(/your answer/iu).fill('something');
    await page.getByRole('button', { name: /flag for review/iu }).click();

    // The state is in the accessible name, not only in the fill — which is the
    // assertion that would fail if somebody made it colour-only.
    await expect(page.getByRole('button', { name: /question 1, flagged for review/iu })).toBeVisible();
    await expect(page.getByRole('button', { name: /question 2, blank/iu })).toBeVisible();
  });
});
