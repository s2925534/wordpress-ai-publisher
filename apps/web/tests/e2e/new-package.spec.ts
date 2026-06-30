import { expect, test } from '@playwright/test';

test('new package flow generates a validated publication package', async ({ page }) => {
  await page.goto('/new-package');

  await page.getByLabel('Rough text or notes').fill(
    'Rough notes about generating a publication package, validating output, and preparing a WordPress draft.'
  );
  await page.getByRole('button', { name: 'Generate package' }).click();

  await expect(page.getByText('Package generated successfully.')).toBeVisible();
  await expect(page.getByText('Open final confirmation')).toBeVisible();
  await expect(page.getByText('SEO Title')).toBeVisible();
  await expect(page.getByText('Readiness Score')).toBeVisible();
});
