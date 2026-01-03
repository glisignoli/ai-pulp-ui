import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

test.describe('README Screenshots', () => {
  test('generate README screenshots', async ({ page }) => {
    // Use deterministic viewport for consistent README images.
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1) Login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/readme-login.png', fullPage: true });

    // Prepare auth for protected pages.
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);

    // 2) Dashboard (stub status API so screenshot is stable)
    await page.route('**/pulp/api/v3/status/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          database_connection: { connected: true },
          redis_connection: { connected: true },
          domain_enabled: false,
          storage: { total: 123, used: 45, free: 78 },
          content_settings: { content_origin: 'http://localhost:8080', content_path_prefix: '/pulp/content' },
          online_workers: [{ name: 'worker-1' }],
          online_api_apps: [{ name: 'api-1' }],
          online_content_apps: [{ name: 'content-1' }],
          versions: [
            {
              component: 'pulpcore',
              version: 'x.y.z',
              package: 'pulpcore',
              module: 'pulpcore',
              domain_compatible: true,
            },
          ],
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/readme-dashboard.png', fullPage: true });

    // 3) Tasks (stub tasks list so screenshot is stable)
    await page.route('**/pulp/api/v3/tasks/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname === '/pulp/api/v3/tasks/') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            count: 2,
            next: null,
            previous: null,
            results: [
              {
                pulp_href: '/pulp/api/v3/tasks/11111111-1111-1111-1111-111111111111/',
                name: 'demo-task-running',
                state: 'running',
                pulp_created: '2025-12-27T00:00:00Z',
                started_at: '2025-12-27T00:00:01Z',
              },
              {
                pulp_href: '/pulp/api/v3/tasks/22222222-2222-2222-2222-222222222222/',
                name: 'demo-task-completed',
                state: 'completed',
                pulp_created: '2025-12-27T00:00:10Z',
                started_at: '2025-12-27T00:00:11Z',
              },
            ],
          }),
        });
        return;
      }

      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Not Found' }),
      });
    });

    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
    await expect(page.getByText('demo-task-running')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/readme-tasks.png', fullPage: true });
  });
});
