import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

test.describe('Page Rendering Tests', () => {
  test('login page renders without console errors', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    // Capture console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Navigate to the page
    await page.goto('/login');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check for the login form
    await expect(page.getByRole('heading', { name: 'Pulp UI' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Log console messages for debugging
    if (consoleMessages.length > 0) {
      console.log('Console messages:', consoleMessages);
    }

    // Assert no errors occurred
    if (errors.length > 0) {
      console.error('Errors found:', errors);
    }
    expect(errors, `Page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('can navigate to login page and see all UI elements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check if all login form elements are present
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'e2e/screenshots/login-page.png' });
  });

  test('dashboard requires authentication', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Try to access dashboard directly
    await page.goto('/');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Should not have any console errors
    expect(errors).toHaveLength(0);
  });

  test('all RPM pages are accessible after authentication', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Login first (set token before app load)
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);

    // Test RPM Distribution page
    await page.goto('/rpm/distribution');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h4')).toContainText('RPM Distributions');
    
    // Test RPM Publication page
    await page.goto('/rpm/publication');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h4')).toBeVisible();
    
    // Test RPM Remote page
    await page.goto('/rpm/remote');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h4')).toContainText('RPM Remotes');
    
    // Test RPM Repository page
    await page.goto('/rpm/repository');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h4')).toContainText('RPM Repositories');

    // Assert no errors occurred
    if (errors.length > 0) {
      console.error('Errors found:', errors);
    }
    expect(errors, `Pages should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('navigation drawer is present and functional', async ({ page }) => {
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if navigation drawer is present
    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();

    // Check for navigation links
    await expect(drawer.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'RPM', exact: true })).toBeVisible();
  });
});
