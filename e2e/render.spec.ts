import { test, expect } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')
const PAGE_READY_TIMEOUT = 30_000;

function isExplicitRunForSpec(specBasename: string): boolean {
  return process.argv.some((arg) =>
    arg === specBasename ||
    arg.endsWith(`/${specBasename}`) ||
    arg.includes(`/${specBasename}:`) ||
    arg.endsWith(`\\${specBasename}`) ||
    arg.includes(`\\${specBasename}:`)
  );
}

const SHOULD_RUN_SCREENSHOTS =
  process.env.RUN_E2E_SCREENSHOTS === '1' ||
  process.env.RUN_RENDER_SCREENSHOTS === '1' ||
  isExplicitRunForSpec('render.spec.ts');

function isBenignConsoleError(message: string) {
  // Chromium can emit these for missing favicon/asset paths; they're not app crashes.
  return message.includes('Failed to load resource') && message.includes('404');
}

async function waitForPageReady(page: import('@playwright/test').Page) {
  await page
    .waitForSelector('[role="progressbar"]', { state: 'detached', timeout: PAGE_READY_TIMEOUT })
    .catch(() => {});
}

test.describe('Page Rendering Tests', () => {
  test('login page renders without console errors', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    // Capture console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        if (!isBenignConsoleError(text)) errors.push(text);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Navigate to the page
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);

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
    test.skip(
      !SHOULD_RUN_SCREENSHOTS,
      'Screenshot generation is opt-in. Run `playwright test e2e/render.spec.ts` or set RUN_E2E_SCREENSHOTS=1.'
    );
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);

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

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isBenignConsoleError(msg.text())) errors.push(msg.text());
    });

    // Test RPM Distribution page
    await page.goto('/rpm/distribution', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: /rpm distributions/i })).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
    
    // Test RPM Publication page
    await page.goto('/rpm/publication', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: /rpm publications/i })).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
    
    // Test RPM Remote page
    await page.goto('/rpm/remote', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: /rpm remotes/i })).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
    
    // Test RPM Repository page
    await page.goto('/rpm/repository', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: /rpm repositories/i })).toBeVisible({ timeout: PAGE_READY_TIMEOUT });

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

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);

    // Check if navigation drawer is present
    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();

    // Check for navigation links
    await expect(drawer.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Tasks', exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'RPM', exact: true })).toBeVisible();
  });
});
