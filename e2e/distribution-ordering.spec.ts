import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

test.describe('Distribution Ordering (mocked)', () => {
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

  test('RPM Distributions sends ordering param and resets offset', async ({ page }) => {
    const requests: Array<{ ordering: string; offset: number; limit: number }> = [];

    await page.route('**/pulp/api/v3/distributions/rpm/rpm/**', async (route) => {
      const url = new URL(route.request().url());
      const ordering = url.searchParams.get('ordering') ?? '';
      const limit = Number(url.searchParams.get('limit') ?? '0');
      const offset = Number(url.searchParams.get('offset') ?? '0');

      requests.push({ ordering, offset, limit });

      if (limit !== 25) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: `expected limit=25, got ${limit}` }),
        });
      }

      const defaultResults = [
        {
          pulp_href: '/pulp/api/v3/distributions/rpm/rpm/1/',
          name: 'default-order',
          base_path: 'default/path',
          hidden: false,
          content_guard: null,
          repository: null,
          publication: null,
        },
      ];

      const orderedResults = [
        {
          pulp_href: '/pulp/api/v3/distributions/rpm/rpm/2/',
          name: 'ordered-by-name',
          base_path: 'ordered/path',
          hidden: false,
          content_guard: null,
          repository: null,
          publication: null,
        },
      ];

      const results = ordering === 'name' ? orderedResults : defaultResults;

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        // Use count > rowsPerPage (25) so the "next page" control is enabled.
        body: JSON.stringify({
          count: 26,
          next: null,
          previous: null,
          results: offset === 25 ? [] : results,
        }),
      });
    });

    await page.goto('/rpm/distribution');

    await expect(page.getByRole('heading', { name: 'RPM Distributions' })).toBeVisible();
    await expect(page.getByText('default-order')).toBeVisible();

    // Move to page 2 so we can validate offset resets back to 0 after ordering change.
    await page.getByLabel('Go to next page').click();

    // Change ordering.
    await page.getByLabel('Order by').click();
    await page.getByRole('option', { name: 'Name', exact: true }).click();

    await expect(page.getByText('ordered-by-name')).toBeVisible();

    expect(requests.some((r) => r.ordering === 'name' && r.offset === 0 && r.limit === 25)).toBe(true);
  });
});
