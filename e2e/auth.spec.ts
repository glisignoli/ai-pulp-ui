import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure auth state is cleared before the app loads.
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('login page is accessible without authentication', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Pulp UI' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('unauthenticated user is redirected to login from dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login or home
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/login');
  });

  test('unauthenticated user is redirected to login from protected routes', async ({ page }) => {
    const protectedRoutes = [
      '/rpm/distribution',
      '/rpm/publication',
      '/rpm/remote',
      '/rpm/repository',
      '/file/distribution',
      '/debian/distribution',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should redirect to login page
      await expect(page).toHaveURL('/login');
    }
  });

  test('authenticated user can access protected routes', async ({ page }) => {
    // Set up authentication before app load.
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);

    // Try accessing protected route
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should stay on dashboard route
    await expect(page).toHaveURL('/');
  });

  test('logout clears authentication', async ({ page }) => {
    // Set up authentication before app load
    await page.addInitScript((token: string) => {
      localStorage.setItem('authToken', token);
    }, ADMIN_TOKEN);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log Out")');
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForLoadState('networkidle');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      
      // Auth token should be cleared
      const hasToken = await page.evaluate(() => {
        return localStorage.getItem('authToken') !== null;
      });
      expect(hasToken).toBe(false);
    }
  });

  test('login form validation works', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Form should have HTML5 validation or show error messages
    const usernameField = page.locator('input[name="username"]');
    const isInvalid = await usernameField.evaluate((el: HTMLInputElement) => {
      return !el.checkValidity();
    });
    
    // Either HTML5 validation prevents submission or error message appears
    expect(isInvalid || await page.locator('text=/required/i').isVisible()).toBeTruthy();
  });

  test('login page renders without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    expect(errors, `Login page should render without errors. Found: ${errors.join(', ')}`).toHaveLength(0);
  });
});
