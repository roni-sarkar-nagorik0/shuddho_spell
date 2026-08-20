import { expect, test } from '@playwright/test';

test('the landing page states the promise and the tagline word', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Spell it.');
  await expect(page.getByText('beautiful')).toBeVisible();
});
