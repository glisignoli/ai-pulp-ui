import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

test.describe('RPM Section Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication before the app loads.
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);
  });

  test('RPM Distribution page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/rpm/distribution');
    await page.waitForLoadState('networkidle');

    // Check for page title
    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
    
    // Check for common UI elements
    await expect(page.locator('table')).toBeVisible();

    expect(errors, `RPM Distribution page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('RPM Publication page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/rpm/publication');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
    await expect(page.locator('button:has-text("Add"), button:has-text("Create")')).toBeVisible();

    expect(errors, `RPM Publication page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('RPM Remote page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/rpm/remote');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
    await expect(page.locator('button:has-text("Add"), button:has-text("Create")')).toBeVisible();

    expect(errors, `RPM Remote page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('RPM Repository page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/rpm/repository');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
    await expect(page.locator('button:has-text("Add"), button:has-text("Create")')).toBeVisible();

    expect(errors, `RPM Repository page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('RPM Distribution detail view renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // First navigate to distributions list
    await page.goto('/rpm/distribution');
    await page.waitForLoadState('networkidle');

    // Try to find a distribution and click view
    const viewButtons = page.locator('button[title="View"]');
    const count = await viewButtons.count();

    if (count > 0) {
      // Click the first view button
      await viewButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Check for detail page elements
      await expect(page.locator('h4').filter({ hasText: 'Distribution:' })).toBeVisible();
      await expect(page.locator('text=Distribution Information')).toBeVisible();
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

      expect(errors, `RPM Distribution detail page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
    } else {
      // If no distributions exist, just verify we can navigate to the view URL
      await page.goto('/rpm/distribution/view?href=%2Fpulp%2Fapi%2Fv3%2Fdistributions%2Frpm%2Frpm%2Ftest%2F');
      await page.waitForLoadState('networkidle');
      // Should show error or "Distribution not found" but should not crash
      expect(errors.filter(e => !e.includes('404') && !e.includes('Failed to load'))).toHaveLength(0);
    }
  });

  test('RPM Publication detail view renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // First navigate to publications list
    await page.goto('/rpm/publication');
    await page.waitForLoadState('networkidle');

    // Try to find a publication and click view
    const viewButtons = page.locator('button[aria-label="view"]');
    const count = await viewButtons.count();

    if (count > 0) {
      // Click the first view button
      await viewButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Check for detail page elements
      await expect(page.locator('h4').filter({ hasText: 'Publication Details' })).toBeVisible();
      await expect(page.locator('text=Publication Information')).toBeVisible();
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

      expect(errors, `RPM Publication detail page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
    } else {
      // If no publications exist, just verify we can navigate to the view URL
      await page.goto('/rpm/publication/view?href=%2Fpulp%2Fapi%2Fv3%2Fpublications%2Frpm%2Frpm%2Ftest%2F');
      await page.waitForLoadState('networkidle');
      // Should show error or "Publication not found" but should not crash
      expect(errors.filter(e => !e.includes('404') && !e.includes('Failed to load'))).toHaveLength(0);
    }
  });

  test('RPM Remote detail view renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // First navigate to remotes list
    await page.goto('/rpm/remote');
    await page.waitForLoadState('networkidle');

    // Try to find a remote and click view
    const viewButtons = page.locator('button[title="View"]');
    const count = await viewButtons.count();

    if (count > 0) {
      // Click the first view button
      await viewButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Check for detail page elements
      await expect(page.locator('h4').filter({ hasText: 'Remote:' })).toBeVisible();
      await expect(page.locator('text=Remote Information')).toBeVisible();
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

      expect(errors, `RPM Remote detail page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
    } else {
      // If no remotes exist, just verify we can navigate to the view URL
      await page.goto('/rpm/remote/view?href=%2Fpulp%2Fapi%2Fv3%2Fremotes%2Frpm%2Frpm%2Ftest%2F');
      await page.waitForLoadState('networkidle');
      // Should show error or "Remote not found" but should not crash
      expect(errors.filter(e => !e.includes('404') && !e.includes('Failed to load'))).toHaveLength(0);
    }
  });

  test('RPM Repository detail view renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // First navigate to repositories list
    await page.goto('/rpm/repository');
    await page.waitForLoadState('networkidle');

    // Try to find a repository and click view
    const viewButtons = page.locator('button[title="View"]');
    const count = await viewButtons.count();

    if (count > 0) {
      // Click the first view button
      await viewButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Check for detail page elements
      await expect(page.locator('h4').filter({ hasText: 'Repository:' })).toBeVisible();
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

      expect(errors, `RPM Repository detail page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
    } else {
      // If no repositories exist, just verify we can navigate to the view URL
      await page.goto('/rpm/repository/view?href=%2Fpulp%2Fapi%2Fv3%2Frepositories%2Frpm%2Frpm%2Ftest%2F');
      await page.waitForLoadState('networkidle');
      // Should show error or "Repository not found" but should not crash
      expect(errors.filter(e => !e.includes('404') && !e.includes('Failed to load'))).toHaveLength(0);
    }
  });
});
