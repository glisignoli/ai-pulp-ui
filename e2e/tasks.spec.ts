import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

test.describe('Tasks E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication before the app loads.
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);
  });

  test('can view a running task JSON detail', async ({ page }) => {
    const taskHref = '/pulp/api/v3/tasks/12345678-1234-1234-1234-1234567890ab/';

    await page.route('**/pulp/api/v3/tasks/**', async (route) => {
      const url = new URL(route.request().url());

      // List endpoint (all tasks by default, or filtered by state)
      if (url.pathname === '/pulp/api/v3/tasks/') {
        const state = url.searchParams.get('state') || '';

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                pulp_href: taskHref,
                name: state ? `demo-task-${state}` : 'demo-task',
                state: state || 'running',
                pulp_created: '2025-12-27T00:00:00Z',
                started_at: '2025-12-27T00:00:01Z',
              },
            ],
          }),
        });
        return;
      }

      // Detail endpoint
      if (url.pathname === taskHref) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            pulp_href: taskHref,
            name: 'demo-task',
            state: 'running',
            pulp_created: '2025-12-27T00:00:00Z',
            started_at: '2025-12-27T00:00:01Z',
            worker: '/pulp/api/v3/workers/1/',
            progress_reports: [],
          }),
        });
        return;
      }

      // Anything else under /tasks/ should not be requested in this flow.
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Not Found' }),
      });
    });

    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
    await expect(page.getByText('demo-task')).toBeVisible();

    const row = page.getByRole('row', { name: /demo-task/ });
    await expect(row.getByRole('cell', { name: 'running' })).toBeVisible();

    // Verify the state filter exists and can change.
    await page.getByRole('combobox', { name: 'State' }).click();
    await page.getByRole('option', { name: 'failed' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('demo-task-failed')).toBeVisible();

    // Click the per-row View action.
    await page.getByRole('row', { name: /demo-task-failed/ }).getByRole('button', { name: 'View' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/tasks\/view\?href=/);
    await expect(page.getByRole('heading', { name: /Task Details/ })).toBeVisible();

    const pre = page.locator('pre');
    await expect(pre).toBeVisible();
    await expect(pre).toContainText('"name": "demo-task"');
    await expect(pre).toContainText('"state": "running"');
    await expect(pre).toContainText('"pulp_href":');
  });
});
