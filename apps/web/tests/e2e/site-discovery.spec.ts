import { expect, test } from '@playwright/test';

test('site discovery refresh updates the cached snapshot', async ({ page }) => {
  await page.goto('/site-discovery');

  await expect(page.getByText('Cached discovery')).toBeVisible();
  await page.getByRole('button', { name: 'Refresh discovery' }).click();

  await expect(page.getByText('Discovery refreshed.')).toBeVisible();
  await expect(page.getByText('REST API')).toBeVisible();
});
