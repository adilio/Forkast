import { expect, test } from '@playwright/test';

test('shortcut URL opens the import surface', async ({ page }) => {
  await page.goto('/import?url=https%3A%2F%2Fexample.com%2Frecipe');
  await expect(page.getByRole('heading', { name: 'Save a recipe' })).toBeVisible();
  await expect(page.getByLabel('Recipe website URL')).toHaveValue(
    'https://example.com/recipe',
  );
  await expect(page.locator('a[aria-current="page"]').last()).toContainText('Import');
});

test('recipe drafts recover without a sticky action overlap', async ({ page }) => {
  await page.goto('/recipes');
  await page.getByRole('button', { name: 'Add first recipe' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  await page.getByLabel('Recipe title').fill('Weeknight noodles 🥢');
  await page.getByLabel(/Ingredients/).fill('2 cups noodles\n1 tbsp sesame oil');
  await page.getByLabel(/Directions/).fill('Boil the noodles.\n\nDress and serve.');

  const directions = await page.getByLabel(/Directions/).boundingBox();
  const actions = await page.locator('.form-actions').boundingBox();
  expect(directions).not.toBeNull();
  expect(actions).not.toBeNull();
  expect(directions!.y + directions!.height).toBeLessThanOrEqual(actions!.y);

  await page.reload();
  await page.getByRole('button', { name: 'Add first recipe' }).click();
  await expect(page.getByLabel('Recipe title')).toHaveValue('Weeknight noodles 🥢');
});

test('the mobile navigation remains reachable', async ({ page }) => {
  await page.goto('/shopping');
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }).last(),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shopping' })).toBeVisible();
});
