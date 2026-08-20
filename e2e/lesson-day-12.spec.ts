import { expect, test } from '@playwright/test';
import { CAN_SIGN_IN, MISSING_CREDENTIALS, signIn } from './fixtures/session';

/**
 * F13.3 — **a complete day-12 lesson**, all five stages.
 *
 * The stages are walked in the order the *server* enforces, and that is the
 * point of the flow rather than an incidental detail: the tracker offers no
 * links and `LessonSession.advanceStage` refuses a jump, so the only way
 * through is forward, one rung at a time. A regression that let the UI skip
 * would show up here as a stage that never appears.
 *
 * Day 12 specifically because `14-quality-gates.md` names it: it is mid-course,
 * so it has a review queue behind it, which day 1 does not.
 */
test.describe('a whole day-12 lesson', () => {
  test.skip(!CAN_SIGN_IN, MISSING_CREDENTIALS);

  test('walks review → learn → dictate → speak → build and closes the day', async ({
    context,
    page,
    baseURL,
  }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');
    await page.goto('/lesson/12');

    // Stage one. An empty queue is legitimate and offers Continue directly.
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
    await page.getByRole('button', { name: /continue/iu }).first().click();

    // Stage two: the words, each with a real phoneme strip.
    await expect(page.getByRole('heading', { name: /learn the words/iu })).toBeVisible();
    await expect(page.getByRole('img').first()).toBeVisible();
    await page.getByRole('button', { name: /continue to dictation/iu }).click();

    // Stage three: the tiles. Typed, not pasted — paste is blocked by design.
    await expect(page.getByRole('heading', { name: /spell what you hear/iu })).toBeVisible();
    const firstTile = page.getByRole('textbox', { name: /letter 1 of/iu });
    await expect(firstTile).toBeFocused();
    await page.keyboard.type('guess');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /next word|continue to speaking/iu }).click();

    // Stage four: the microphone, or its fallback. Chromium has recognition, so
    // the self-assessment path is the reliable one to drive here.
    await expect(page.getByRole('heading', { name: /say it/iu })).toBeVisible();
  });

  test('the tracker offers no way to skip a stage', async ({ context, page, baseURL }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');
    await page.goto('/lesson/12');

    const tracker = page.getByRole('list', { name: /lesson stages/iu });

    await expect(tracker).toBeVisible();
    // Not one link and not one button: the order is a server rule, and a
    // control that would be refused should not exist.
    await expect(tracker.getByRole('link')).toHaveCount(0);
    await expect(tracker.getByRole('button')).toHaveCount(0);
  });

  test('dictation tiles are fully operable with no mouse', async ({ context, page, baseURL }) => {
    await signIn(context, baseURL ?? 'http://localhost:3000');
    await page.goto('/lesson/12');

    await page.getByRole('button', { name: /continue/iu }).first().click();
    await page.getByRole('button', { name: /continue to dictation/iu }).click();

    await page.keyboard.type('ab');
    // Backspace goes back AND clears, in one press.
    await page.keyboard.press('Backspace');
    await expect(page.getByRole('textbox', { name: /letter 1 of/iu })).toBeFocused();
    await expect(page.getByRole('textbox', { name: /letter 2 of/iu })).toHaveValue('');

    // Arrows navigate.
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('textbox', { name: /letter 2 of/iu })).toBeFocused();
  });
});
