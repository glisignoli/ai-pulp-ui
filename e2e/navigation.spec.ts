import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication before the app loads.
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);
  });

  test('navigation drawer is present and contains all sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.MuiDrawer-paper');

    // Check for main navigation items
    await expect(drawer.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'RPM', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'File', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Debian', exact: true })).toBeVisible();
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
  });

  test('can navigate from dashboard to Debian sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.MuiDrawer-paper');

    // Click on Debian to expand
    await drawer.getByRole('button', { name: 'Debian', exact: true }).click();
    await page.waitForTimeout(500); // Wait for expansion animation
    
    // Check for Debian subsections
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
    // These should load without crashing, even if resource not found
    const detailRoutes = [
      '/rpm/distribution/view?href=%2Fpulp%2Fapi%2Fv3%2Fdistributions%2Frpm%2Frpm%2Ftest%2F',
      '/rpm/publication/view?href=%2Fpulp%2Fapi%2Fv3%2Fpublications%2Frpm%2Frpm%2Ftest%2F',
      '/rpm/remote/view?href=%2Fpulp%2Fapi%2Fv3%2Fremotes%2Frpm%2Frpm%2Ftest%2F',
      '/rpm/repository/view?href=%2Fpulp%2Fapi%2Fv3%2Frepositories%2Frpm%2Frpm%2Ftest%2F',
    ];

    for (const route of detailRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should not crash - either shows detail or error message
      await expect(page.locator('h4')).toBeVisible();
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
    }
  });
});
