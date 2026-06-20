import { test, expect } from '@playwright/test';

test('landing + nav render', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Summary' })).toBeVisible();
});

test('logger shows the seeded week and totals', async ({ page }) => {
  await page.goto('/log');
  await expect(page.getByRole('heading', { name: 'Log your week' })).toBeVisible();
  await expect(page.getByText(/exercises this week/)).toBeVisible();
});

test('summary computes muscle load + renders the 3D heatmap container', async ({ page }) => {
  await page.goto('/summary');
  await expect(page.getByRole('heading', { name: 'Muscle load' })).toBeVisible();
  await expect(page.getByLabel(/3D muscle heatmap/)).toBeVisible();
});

test('settings exposes the AI provider + accessibility controls', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText('AI coach provider')).toBeVisible();
  await expect(page.getByText(/Colorblind-safe/)).toBeVisible();
});
