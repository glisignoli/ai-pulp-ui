import { test, expect } from '@playwright/test';

test.describe('Debian Section Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'dGVzdDp0ZXN0');
    });
  });

  test('Debian Distribution page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/debian/distribution');
    await page.waitForLoadState('networkidle');

    // Check for page title
    await expect(page.locator('text=/Deb Distributions/i')).toBeVisible();

    expect(errors, `Debian Distribution page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('Debian Publication page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/debian/publication');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/Deb Publications/i')).toBeVisible();

    expect(errors, `Debian Publication page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('Debian Remote page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/debian/remote');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/Deb Remotes/i')).toBeVisible();

    expect(errors, `Debian Remote page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('Debian Repository page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/debian/repository');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/Deb Repositories/i')).toBeVisible();

    expect(errors, `Debian Repository page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });
});
