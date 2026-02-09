import { test, expect, type Page } from '@playwright/test';

const PAGE_READY_TIMEOUT = 30_000;

async function waitForPageReady(page: Page) {
  await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: PAGE_READY_TIMEOUT }).catch(() => {});
}

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

    await page.goto('/deb/distribution', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: 'DEB Distributions' })).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
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

    await page.goto('/deb/publication', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: 'DEB Publications' })).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
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

    await page.goto('/deb/remote', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: 'DEB Remotes' })).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
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

    await page.goto('/deb/repository', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: 'DEB Repositories' })).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
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

    await page.goto('/deb/content/packages', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: 'DEB Packages' })).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
    expect(errors, `DEB Packages page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(
      0
    );
  });

  test('DEB Packages Upload dialog opens', async ({ page }) => {
    await page.goto('/deb/content/packages', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);

    await expect(page.getByRole('heading', { name: 'DEB Packages' })).toBeVisible({ timeout: PAGE_READY_TIMEOUT });

    await page.getByRole('button', { name: 'Upload Package' }).click();

    await expect(page.getByRole('heading', { name: 'Upload DEB Package' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose DEB File' })).toBeVisible();
    await expect(page.getByLabel('Distribution')).toBeVisible();
    await expect(page.getByLabel('Component')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible();
  });
});
