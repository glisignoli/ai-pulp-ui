import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

test.describe('Container Section Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication before the app loads.
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);
  });

  test('Container Repository page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/container/repository');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Container Repositories' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Repository' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    expect(errors, `Container Repository page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('Container Repository create dialog opens', async ({ page }) => {
    await page.goto('/container/repository');
    await page.getByRole('button', { name: 'Create Repository' }).click();

    await expect(page.getByRole('heading', { name: 'Create Repository' })).toBeVisible();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel(/^Name\b/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
  });

  test('Container Remote page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/container/remote');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Container Remotes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Remote' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    expect(errors, `Container Remote page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('Container Remote create dialog opens', async ({ page }) => {
    await page.goto('/container/remote');
    await page.getByRole('button', { name: 'Create Remote' }).click();

    await expect(page.getByRole('heading', { name: 'Create Remote' })).toBeVisible();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel(/^Name\b/i)).toBeVisible();
    await expect(dialog.getByLabel(/^URL\b/i)).toBeVisible();
    await expect(dialog.getByLabel(/^Upstream Name\b/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
  });

  test('Container Distribution page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/container/distribution');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Container Distributions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Distribution' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    expect(errors, `Container Distribution page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('Container Distribution create dialog opens', async ({ page }) => {
    await page.goto('/container/distribution');
    await page.getByRole('button', { name: 'Create Distribution' }).click();

    await expect(page.getByRole('heading', { name: 'Create Distribution' })).toBeVisible();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel(/^Name\b/i)).toBeVisible();
    await expect(dialog.getByLabel(/^Base Path\b/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
  });
});
