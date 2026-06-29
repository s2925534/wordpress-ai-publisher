import { expect, test } from '@playwright/test';

test('home page renders the phase 1 foundation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'WordPress AI Publishing Assistant' })).toBeVisible();
  await expect(page.getByText('Phase 1 foundation')).toBeVisible();
});
