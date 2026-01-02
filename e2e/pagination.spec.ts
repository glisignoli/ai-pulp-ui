import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

const makeDebPackage = (i: number) => ({
  pulp_href: `/pulp/api/v3/content/deb/packages/${i}/`,
  package: `pkg-${i}`,
  version: `1.0.${i}`,
  architecture: 'amd64',
});

test.describe('Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);
  });

  test('DEB Packages supports paging (25 per page)', async ({ page }) => {
    await page.route('**/pulp/api/v3/content/deb/packages/**', async (route) => {
      const url = new URL(route.request().url());
      const limit = Number(url.searchParams.get('limit') ?? '0');
      const offset = Number(url.searchParams.get('offset') ?? '0');

      if (limit !== 25) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: `expected limit=25, got ${limit}` }),
        });
      }

      const count = 30;
      const pageItems = offset === 0
        ? Array.from({ length: 25 }, (_, idx) => makeDebPackage(idx))
        : Array.from({ length: 5 }, (_, idx) => makeDebPackage(25 + idx));

      const next = offset === 0 ? `/pulp/api/v3/content/deb/packages/?limit=25&offset=25` : null;
      const previous = offset === 0 ? null : `/pulp/api/v3/content/deb/packages/?limit=25&offset=0`;

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count,
          next,
          previous,
          results: pageItems,
        }),
      });
    });

    await page.goto('/deb/content/packages');

    await expect(page.getByRole('heading', { name: 'DEB Packages' })).toBeVisible();
    await expect(page.getByText('pkg-0')).toBeVisible();
    await expect(page.getByText('pkg-24')).toBeVisible();
    await expect(page.getByText('pkg-25')).toHaveCount(0);

    await page.getByLabel('Go to next page').click();

    await expect(page.getByText('pkg-25')).toBeVisible();
    await expect(page.getByText('pkg-29')).toBeVisible();
    await expect(page.getByText('pkg-0')).toHaveCount(0);
  });
});
