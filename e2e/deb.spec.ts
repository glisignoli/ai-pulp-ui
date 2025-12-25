import { test, expect } from '@playwright/test';

test.describe('DEB Section Tests', () => {
  const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

  test.beforeEach(async ({ page }) => {
    // Avoid relying on a live Pulp backend for login.
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);
  });

  test('DEB Distribution page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/deb/distribution');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'DEB Distributions' })).toBeVisible();
    expect(
      errors,
      `DEB Distribution page should render without errors. Found: ${errors.join(', ')}`
    ).toHaveLength(0);
  });

  test('DEB Publication page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/deb/publication');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'DEB Publications' })).toBeVisible();
    expect(
      errors,
      `DEB Publication page should render without errors. Found: ${errors.join(', ')}`
    ).toHaveLength(0);
  });

  test('DEB Remote page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/deb/remote');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'DEB Remotes' })).toBeVisible();
    expect(errors, `DEB Remote page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(
      0
    );
  });

  test('DEB Repository page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/deb/repository');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'DEB Repositories' })).toBeVisible();
    expect(
      errors,
      `DEB Repository page should render without errors. Found: ${errors.join(', ')}`
    ).toHaveLength(0);
  });

  test('DEB Packages page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/deb/content/packages');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'DEB Packages' })).toBeVisible();
    expect(errors, `DEB Packages page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(
      0
    );
  });
});
