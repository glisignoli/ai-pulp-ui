import path from 'path';
import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

test.describe('RPM Packages (Real API)', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);
  });

  test('upload, list, and inspect package', async ({ page }) => {
    await page.goto('/rpm/content/packages');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /rpm packages/i })).toBeVisible();

    await page.getByRole('button', { name: /upload package/i }).click();

    const dialog = page.getByRole('dialog', { name: /upload rpm package/i });
    await expect(dialog).toBeVisible();

    const rpmPath = path.join(process.cwd(), 'tests', 'fixtures', 'dog-4.23-1.noarch.rpm');
    await dialog.locator('input[type="file"]').setInputFiles(rpmPath);

    await dialog.getByRole('button', { name: /^upload$/i }).click();

    await expect(page.getByText(/package uploaded successfully/i)).toBeVisible({ timeout: 60_000 });

    await expect
      .poll(
        async () => {
          await page.waitForTimeout(500);
          return await page.getByRole('cell', { name: 'dog', exact: true }).count();
        },
        { timeout: 60_000, intervals: [500, 1000, 2000, 3000, 5000] }
      )
      .toBeGreaterThan(0);

    const row = page.getByRole('row', { name: /dog/i });
    await row.getByRole('button', { name: 'view' }).click();

    await expect(page.getByRole('heading', { name: /package details/i })).toBeVisible();
    await expect(page.getByText(/get result/i)).toBeVisible();
    await expect(page.locator('pre')).toContainText('"name": "dog"');
    await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
  });
});
