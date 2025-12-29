# Browser Rendering Tests (Playwright)

This directory contains end-to-end tests that verify the application renders correctly in real browsers.

## Purpose

These tests ensure that:
- Pages load without console errors
- The UI renders correctly in multiple browsers (Chrome, Firefox, Safari)
- No JavaScript module import errors occur
- Navigation works as expected
- All components are visible and functional

## Running the Tests

### Prerequisites
Install Playwright browsers (only needed once):
```bash
npm run playwright:install
```

### Run Tests
```bash
# Run all tests headlessly
npm run test:e2e

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug
```

## Test Files

- `render.spec.ts` - Tests that verify pages render without errors
  - Login page rendering
  - Dashboard authentication
  - RPM pages (Distribution, Publication, Remote, Repository)
  - Navigation drawer functionality

## What These Tests Catch

1. **Module Import Errors**: Catches issues like "The requested module does not provide an export named..."
2. **JavaScript Runtime Errors**: Any uncaught exceptions in the browser
3. **Missing UI Elements**: Verifies that expected components are present and visible
4. **Console Errors**: Monitors browser console for any error messages

## Test Configuration

Configuration is in `playwright.config.ts`:
- Tests run against `http://localhost:3000` (Vite dev server)
- Automatic dev server startup
- Tests run in 3 browsers: Chromium, Firefox, and WebKit
- Screenshots saved to `e2e/screenshots/`
- HTML test report generated after test run

## Viewing Test Results

After running tests, view the HTML report:
```bash
npx playwright show-report
```

## CI/CD Integration

These tests are designed to run in CI environments:
- Automatic retries on failure in CI
- Single worker in CI to avoid resource issues
- Dev server automatically started and stopped
