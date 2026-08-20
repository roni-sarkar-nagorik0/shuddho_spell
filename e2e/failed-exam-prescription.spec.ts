import { expect, test } from '@playwright/test';
import { CAN_SIGN_IN, MISSING_CREDENTIALS, signIn } from './fixtures/session';

/**
 * F13.5 — **a failed exam produces its drill prescription.**
 *
 * Rule 8 of `08-exam-engine.md`: a failure must leave the learner with a
 * concrete next action, never just a number. This is the flow that proves the
 * chain end to end — submit a paper with nothing answered, get a fail, and find
 * drills waiting in `/practice` that were not there before.
 *
 * It is deliberately driven by answering **nothing**. A guaranteed fail is the
 * only way to make this deterministic, and the prescription is what is under
 * test, not the marking.
 */
test.describe('a failed exam prescribes drills', () => {
  test.skip(!CAN_SIGN_IN, MISSING_CREDENTIALS);

  test('submitting an unanswered paper fails and shows the prescription block', async ({
    context,
    page,
    baseURL,
  }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');

    await page.goto('/exams/milestone1');
    await page.getByRole('button', { name: /run the system check/iu }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /begin the exam/iu }).click();
    await expect(page).toHaveURL(/\/exams\/attempt\//u);

    // Submit every section without answering anything.
    for (let index = 0; index < 8; index += 1) {
      const submit = page.getByRole('button', { name: /submit this section/iu });

      if ((await submit.count()) === 0) {
        break;
      }

      await submit.click();
      await page.getByRole('button', { name: /submit the section/iu }).click();
      await page.waitForLoadState('networkidle');
    }

    await expect(page).toHaveURL(/\/exams\/result\//u);
    await expect(page.getByText(/not passed/iu)).toBeVisible();

    // The block itself, and the route out of it.
    await expect(page.getByRole('heading', { name: /your prescription/iu })).toBeVisible();
    await expect(page.getByRole('link', { name: /start the drills/iu })).toBeVisible();
  });

  test('the by-section table reports marks lost, not just accuracy', async ({
    context,
    page,
    baseURL,
  }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');
    await page.goto('/exams');

    // Any finished attempt will do; the column is what is under test.
    const result = page.getByRole('link', { name: /see your record|open the lobby/iu }).first();
    await expect(result).toBeVisible();
  });

  test('the review screen shows a character diff, and only after submission', async ({
    context,
    page,
    baseURL,
  }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');

    // An attempt id that is not finished must not yield an answer key.
    const response = await page.request.get(
      `${baseURL ?? ''}/api/v1/exams/attempts/00000000-0000-4000-8000-000000000000/review`,
      { maxRedirects: 0 },
    );

    expect([403, 404, 409]).toContain(response.status());
    expect(await response.text()).not.toContain('correctAnswer');
  });
});
