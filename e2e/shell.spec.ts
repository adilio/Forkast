import { expect, test } from '@playwright/test';

test('shortcut URL opens the import surface', async ({ page }) => {
  await page.goto('/import?url=https%3A%2F%2Fexample.com%2Frecipe');
  await expect(page.getByRole('heading', { name: 'Save a recipe' })).toBeVisible();
  await expect(page.getByLabel('Recipe website URL')).toHaveValue(
    'https://example.com/recipe',
  );
});

test('the mobile navigation remains reachable', async ({ page }) => {
  await page.goto('/shopping');
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }).last(),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'A clear list for each store' }),
  ).toBeVisible();
});
