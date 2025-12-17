import { test, expect } from '@playwright/test';

test.describe('File Section Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'dGVzdDp0ZXN0');
    });
  });

  test('File Distribution page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/file/distribution');
    await page.waitForLoadState('networkidle');

    // Check for page title
    await expect(page.locator('text=/File Distributions/i')).toBeVisible();

    expect(errors, `File Distribution page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('File Publication page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/file/publication');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/File Publications/i')).toBeVisible();

    expect(errors, `File Publication page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('File Remote page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/file/remote');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/File Remotes/i')).toBeVisible();

    expect(errors, `File Remote page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('File Repository page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/file/repository');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/File Repositories/i')).toBeVisible();

    expect(errors, `File Repository page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });
});
