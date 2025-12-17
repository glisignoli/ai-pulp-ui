import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

test.describe('RPM Section Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication before the app loads.
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);
  });

  test('RPM Distribution page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/rpm/distribution');
    await page.waitForLoadState('networkidle');

    // Check for page title
    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
    
    // Check for common UI elements
    await expect(page.locator('table')).toBeVisible();

    expect(errors, `RPM Distribution page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('RPM Publication page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/rpm/publication');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
    await expect(page.locator('button:has-text("Add"), button:has-text("Create")')).toBeVisible();

    expect(errors, `RPM Publication page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('RPM Remote page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/rpm/remote');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
    await expect(page.locator('button:has-text("Add"), button:has-text("Create")')).toBeVisible();

    expect(errors, `RPM Remote page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('RPM Repository page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/rpm/repository');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
    await expect(page.locator('button:has-text("Add"), button:has-text("Create")')).toBeVisible();

    expect(errors, `RPM Repository page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });
});
