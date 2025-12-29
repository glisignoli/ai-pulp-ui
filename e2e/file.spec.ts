import { test, expect } from '@playwright/test';

test.describe('File Section Tests', () => {
  const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

  test.beforeEach(async ({ page }) => {
    // Set up authentication before the app loads.
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);
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
    await expect(page.getByRole('button', { name: 'Create Distribution' })).toBeVisible();

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
    await expect(page.getByRole('button', { name: 'Create Publication' })).toBeVisible();

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
    await expect(page.getByRole('button', { name: 'Create Remote' })).toBeVisible();

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
    await expect(page.getByRole('button', { name: 'Upload File' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Repository' })).toBeVisible();

    expect(errors, `File Repository page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('File Distribution create dialog opens', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/file/distribution');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Create Distribution' }).click();
    await expect(page.getByRole('heading', { name: 'Create Distribution' })).toBeVisible();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();

    expect(errors, `File Distribution create dialog should open without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('File Remote create dialog opens', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/file/remote');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Create Remote' }).click();
    await expect(page.getByRole('heading', { name: 'Create Remote' })).toBeVisible();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('URL')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();

    expect(errors, `File Remote create dialog should open without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('File Upload dialog opens', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/file/repository');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Upload File' }).click();
    await expect(page.getByRole('heading', { name: 'Upload File' })).toBeVisible();
    await expect(page.getByLabel('Repository')).toBeVisible();
    await expect(page.getByLabel('Relative Path')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose File' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible();

    expect(errors, `File upload dialog should open without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });
});
