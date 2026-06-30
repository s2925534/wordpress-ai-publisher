import { expect, test } from '@playwright/test';

test('package editor supports image preparation and alt text editing', async ({ page, request }) => {
  const generateResponse = await request.post('/api/packages/generate', {
    data: {
      inputText:
        'Rough notes about preparing the final confirmation screen, featured images, and accessibility checks.',
      sourceSafetyType: 'notes_only',
      siteKey: 'default-site',
      contentProfileKey: 'linkedin-blog-package'
    }
  });

  expect(generateResponse.ok()).toBeTruthy();
  const generated = (await generateResponse.json()) as { data?: { packageId?: string } };
  const packageId = generated.data?.packageId;
  expect(packageId).toBeTruthy();

  await page.goto(`/packages/${packageId}`);
  await expect(page.getByRole('heading', { name: 'Package editor' })).toBeVisible();

  await page.getByRole('button', { name: 'Prepare image' }).click();
  await expect(page.getByText('Featured image prepared.')).toBeVisible();
  await expect(page.getByText('Image preview')).toBeVisible();

  await page.getByLabel('Alt Text').fill(' ');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Package saved.')).toBeVisible();
});
