import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

const makeRpmDistribution = (i: number) => ({
  pulp_href: `/pulp/api/v3/distributions/rpm/rpm/${i}/`,
  name: `dist-${i}`,
  base_path: `base/path/${i}`,
  hidden: false,
  content_guard: null,
  repository: null,
  publication: null,
});

test.describe('Distribution Pagination (mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);

    // Avoid backend dependency for side-loads.
    await page.route('**/pulp/api/v3/publications/rpm/rpm/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
      });
    });

    await page.route('**/pulp/api/v3/repositories/rpm/rpm/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
      });
    });
  });

  test('RPM Distributions supports paging (25 per page)', async ({ page }) => {
    await page.route('**/pulp/api/v3/distributions/rpm/rpm/**', async (route) => {
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
        ? Array.from({ length: 25 }, (_, idx) => makeRpmDistribution(idx))
        : Array.from({ length: 5 }, (_, idx) => makeRpmDistribution(25 + idx));

      const next = offset === 0 ? `/pulp/api/v3/distributions/rpm/rpm/?limit=25&offset=25` : null;
      const previous = offset === 0 ? null : `/pulp/api/v3/distributions/rpm/rpm/?limit=25&offset=0`;

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

    await page.goto('/rpm/distribution');

    await expect(page.getByRole('heading', { name: 'RPM Distributions' })).toBeVisible();
    await expect(page.getByText('dist-0')).toBeVisible();
    await expect(page.getByText('dist-24')).toBeVisible();
    await expect(page.getByText('dist-25')).toHaveCount(0);

    await page.getByLabel('Go to next page').click();

    await expect(page.getByText('dist-25')).toBeVisible();
    await expect(page.getByText('dist-29')).toBeVisible();
    await expect(page.getByText('dist-0')).toHaveCount(0);
  });
});
