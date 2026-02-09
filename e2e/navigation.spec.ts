import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication before the app loads.
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);
  });

  test('can fill Orphans Cleanup content hrefs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.MuiDrawer-paper');
    await drawer.getByRole('button', { name: 'Management', exact: true }).click();
    await drawer.getByRole('button', { name: 'Orphans Cleanup', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Orphans Cleanup', exact: true })).toBeVisible();

    await page
      .getByLabel('Content hrefs', { exact: true })
      .fill('/pulp/api/v3/content/file/files/123/\n/pulp/api/v3/content/file/files/456/');
    await expect(page.getByLabel('Content hrefs', { exact: true })).toHaveValue(
      '/pulp/api/v3/content/file/files/123/\n/pulp/api/v3/content/file/files/456/'
    );

    await expect(page.getByText('Request body', { exact: true })).toHaveCount(0);
  });

  test('navigation drawer is present and contains all sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.MuiDrawer-paper');

    // Verify main navigation contains all expected sections.
    const mainNavButtons = drawer.locator('ul').first().locator('.MuiListItemButton-root');
    const mainNavLabels = (await mainNavButtons.allTextContents())
      .map((text) => text.trim())
      .filter(Boolean);
    expect([...mainNavLabels].sort()).toEqual(
      ['About', 'Container', 'DEB', 'File', 'Home', 'Management', 'RPM', 'Tasks'].sort()
    );

    // Check for main navigation items
    await expect(drawer.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Management', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'About', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Tasks', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'RPM', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'File', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'DEB', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Container', exact: true })).toBeVisible();

    // Expand Management and ensure expected items are available.
    await drawer.getByRole('button', { name: 'Management', exact: true }).click();
    await expect(drawer.getByRole('button', { name: 'Users', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Orphans Cleanup', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Repair', exact: true })).toBeVisible();
  });

  test('can navigate from dashboard to Container sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.MuiDrawer-paper');

    // Click on Container to expand
    await drawer.getByRole('button', { name: 'Container', exact: true }).click();

    // Check for Container subsections
    await expect(drawer.getByRole('button', { name: 'Distributions', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Remotes', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Repositories', exact: true })).toBeVisible();
  });

  test('can navigate from dashboard to RPM sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.MuiDrawer-paper');

    // Click on RPM to expand
    await drawer.getByRole('button', { name: 'RPM', exact: true }).click();
    
    // Check for RPM subsections
    await expect(drawer.getByRole('button', { name: 'Distribution', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Publication', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Remote', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Repository', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Packages', exact: true })).toBeVisible();
  });

  test('can navigate from dashboard to File sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.MuiDrawer-paper');

    // Click on File to expand
    await drawer.getByRole('button', { name: 'File', exact: true }).click();
    await page.waitForTimeout(500); // Wait for expansion animation
    
    // Check for File subsections
    await expect(drawer.getByRole('button', { name: 'Distribution', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Files', exact: true })).toBeVisible();
  });

  test('can navigate from dashboard to DEB sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.MuiDrawer-paper');

    // Click on DEB to expand
    await drawer.getByRole('button', { name: 'DEB', exact: true }).click();
    await page.waitForTimeout(500); // Wait for expansion animation
    
    // Check for DEB subsections
    await expect(drawer.getByRole('button', { name: 'Distribution', exact: true })).toBeVisible();
  });

  test('navigation drawer can be toggled', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.MuiDrawer-paper');

    // Toggle via the explicit drawer "Collapse" control.
    const collapseControl = drawer.locator('.MuiListItemButton-root').last();
    await collapseControl.click();
    await page.waitForTimeout(500);

    // When collapsed, text labels are not rendered.
    await expect(drawer.getByText('RPM')).toHaveCount(0);

    // Expand again and ensure navigation labels return.
    await collapseControl.click();
    await page.waitForTimeout(500);
    await expect(drawer.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  });

  test('clicking navigation links navigates to correct pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.MuiDrawer-paper');

    // Expand RPM section
    await drawer.getByRole('button', { name: 'RPM', exact: true }).click();
    await page.waitForTimeout(300);

    // Click on Distribution
    await drawer.getByRole('button', { name: 'Distribution', exact: true }).click();
    
    // Verify navigation
    await expect(page).toHaveURL('/rpm/distribution');
    await page.waitForLoadState('networkidle');
  });

  test('invalid routes redirect to home', async ({ page }) => {
    await page.goto('/invalid-route-that-does-not-exist');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to dashboard (home)
    await expect(page).toHaveURL('/');
  });

  test('all navigation sections are collapsible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.MuiDrawer-paper');

    // Test RPM section
    const rpmSection = drawer.getByRole('button', { name: 'RPM', exact: true });
    await rpmSection.click();
    await page.waitForTimeout(300);
    
    // Verify subsection appears
    await expect(drawer.getByRole('button', { name: 'Distribution', exact: true })).toBeVisible();
    
    // Click again to collapse
    await rpmSection.click();
    await page.waitForTimeout(300);

    await expect(drawer.getByRole('button', { name: 'Distribution', exact: true })).toHaveCount(0);
  });

  test('can navigate to RPM Distribution detail view', async ({ page }) => {
    await page.goto('/rpm/distribution');
    await page.waitForLoadState('networkidle');

    // Try to find a view button and click it
    const viewButtons = page.locator('button[title="View"]');
    const count = await viewButtons.count();

    if (count > 0) {
      await viewButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Should be on detail view page
      await expect(page.locator('h4').filter({ hasText: 'Distribution:' })).toBeVisible();
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

      // Click back button
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page).toHaveURL('/rpm/distribution');
    }
  });

  test('can navigate to RPM Publication detail view', async ({ page }) => {
    await page.goto('/rpm/publication');
    await page.waitForLoadState('networkidle');

    // Try to find a view button and click it
    const viewButtons = page.locator('button[aria-label="view"]');
    const count = await viewButtons.count();

    if (count > 0) {
      await viewButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Should be on detail view page
      await expect(page.locator('h4').filter({ hasText: 'Publication Details' })).toBeVisible();
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

      // Click back button
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page).toHaveURL('/rpm/publication');
    }
  });

  test('can navigate to File Publication detail view', async ({ page }) => {
    await page.goto('/file/publication');
    await page.waitForLoadState('networkidle');

    // Try to find a view button and click it
    const viewButtons = page.locator('button[aria-label="view"]');
    const count = await viewButtons.count();

    if (count > 0) {
      await viewButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Should be on detail view page
      await expect(page.locator('h4').filter({ hasText: 'Publication Details' })).toBeVisible();
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

      // Click back button
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page).toHaveURL('/file/publication');
    }
  });

  test('can navigate to DEB Publication detail view', async ({ page }) => {
    await page.goto('/deb/publication');
    await page.waitForLoadState('networkidle');

    // Try to find a view button and click it
    const viewButtons = page.locator('button[aria-label="view"]');
    const count = await viewButtons.count();

    if (count > 0) {
      await viewButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Should be on detail view page
      await expect(page.locator('h4').filter({ hasText: 'Publication Details' })).toBeVisible();
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

      // Click back button
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page).toHaveURL('/deb/publication');
    }
  });

  test('can navigate to RPM Remote detail view', async ({ page }) => {
    await page.goto('/rpm/remote');
    await page.waitForLoadState('networkidle');

    // Try to find a view button and click it
    const viewButtons = page.locator('button[title="View"]');
    const count = await viewButtons.count();

    if (count > 0) {
      await viewButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Should be on detail view page
      await expect(page.locator('h4').filter({ hasText: 'Remote:' })).toBeVisible();
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

      // Click back button
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page).toHaveURL('/rpm/remote');
    }
  });

  test('can navigate to RPM Repository detail view', async ({ page }) => {
    await page.goto('/rpm/repository');
    await page.waitForLoadState('networkidle');

    // Try to find a view button and click it
    const viewButtons = page.locator('button[title="View"]');
    const count = await viewButtons.count();

    if (count > 0) {
      await viewButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Should be on detail view page
      await expect(page.locator('h4').filter({ hasText: 'Repository:' })).toBeVisible();
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

      // Click back button
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page).toHaveURL('/rpm/repository');
    }
  });

  test('detail view routes are accessible directly', async ({ page }) => {
    test.setTimeout(120_000);

    // These should load without crashing, even if resource not found
    const detailRoutes = [
      '/rpm/distribution/view?href=%2Fpulp%2Fapi%2Fv3%2Fdistributions%2Frpm%2Frpm%2Ftest%2F',
      '/rpm/publication/view?href=%2Fpulp%2Fapi%2Fv3%2Fpublications%2Frpm%2Frpm%2Ftest%2F',
      '/file/publication/view?href=%2Fpulp%2Fapi%2Fv3%2Fpublications%2Ffile%2Ffile%2Ftest%2F',
      '/deb/publication/view?href=%2Fpulp%2Fapi%2Fv3%2Fpublications%2Fdeb%2Fapt%2Ftest%2F',
      '/rpm/remote/view?href=%2Fpulp%2Fapi%2Fv3%2Fremotes%2Frpm%2Frpm%2Ftest%2F',
      '/rpm/repository/view?href=%2Fpulp%2Fapi%2Fv3%2Frepositories%2Frpm%2Frpm%2Ftest%2F',
      '/rpm/content/packages/view?href=%2Fpulp%2Fapi%2Fv3%2Fcontent%2Frpm%2Fpackages%2Ftest%2F',
    ];

    for (const route of detailRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      // Wait for loading to complete - either we see content or an error state.
      await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 10_000 }).catch(() => {});

      await expect
        .poll(
          async () => {
            const hasHeading = await page.locator('h4').first().isVisible().catch(() => false);
            const hasAlert = await page.locator('[role="alert"]').first().isVisible().catch(() => false);
            const hasBack = await page.getByRole('button', { name: /back/i }).isVisible().catch(() => false);
            return (hasHeading || hasAlert) && hasBack;
          },
          { timeout: 20_000, intervals: [250, 500, 1000] }
        )
        .toBeTruthy();
    }
  });
});
