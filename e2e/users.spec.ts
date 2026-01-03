import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')
const API_ORIGIN = 'http://localhost:8080';
const API_BASE = `${API_ORIGIN}/pulp/api/v3`;

function uniqueName(prefix: string) {
  const rand = Math.random().toString(16).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

async function setAuthToken(page: Page) {
  await page.addInitScript((token: string) => {
    localStorage.setItem('authToken', token);
  }, ADMIN_TOKEN);
}

function apiHeaders() {
  return {
    Authorization: `Basic ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function apiGetJson<T>(request: APIRequestContext, url: string): Promise<T> {
  const response = await request.get(url, { headers: apiHeaders() });
  expect(response.ok(), `GET ${url} failed: ${response.status()}`).toBeTruthy();
  return (await response.json()) as T;
}

async function apiDelete(request: APIRequestContext, pulpHrefOrUrl: string) {
  const url = pulpHrefOrUrl.startsWith('http') ? pulpHrefOrUrl : `${API_ORIGIN}${pulpHrefOrUrl}`;
  const response = await request.delete(url, { headers: apiHeaders() });
  expect([200, 202, 204, 404]).toContain(response.status());
}

async function deleteByUsername(request: APIRequestContext, username: string) {
  const url = `${API_BASE}/users/?username=${encodeURIComponent(username)}`;
  const data = await apiGetJson<{ results?: Array<{ pulp_href: string }> }>(request, url);
  for (const item of data.results ?? []) {
    await apiDelete(request, item.pulp_href);
  }
}

test.describe('Users CRUD (Real API)', () => {
  test.describe.configure({ timeout: 180_000 });

  test('Users: create/edit/delete', async ({ page, request }) => {
    const username = uniqueName('pw-user');

    try {
      await setAuthToken(page);
      await page.goto('/users');

      await expect(page.getByRole('heading', { name: /^users$/i })).toBeVisible();

      await page.getByRole('button', { name: /create user/i }).click();

      const dialog = page.getByRole('dialog', { name: /create user/i });
      await expect(dialog).toBeVisible();

      await dialog.getByLabel('Username').fill(username);
      // Pulp enforces a minimum password length (>= 8 chars)
      await dialog.getByLabel('Password').fill('pw-123456');
      await dialog.getByLabel('First Name').fill('Play');
      await dialog.getByLabel('Last Name').fill('Wright');
      await dialog.getByLabel('Email').fill(`${username}@example.com`);

      await dialog.getByRole('button', { name: /^create$/i }).click();

      // In the containerized environment, user creation + list refresh can take longer.
      // First ensure the dialog closes (submit completed), then assert on the refreshed list.
      await expect(dialog).toBeHidden({ timeout: 30_000 });

      await expect(page.getByRole('cell', { name: username, exact: true })).toBeVisible({ timeout: 30_000 });

      const row = page.getByRole('row', { name: new RegExp(username, 'i') });
      await row.getByTitle('Edit').click();

      const editDialog = page.getByRole('dialog', { name: /edit user/i });
      await expect(editDialog).toBeVisible();

      await editDialog.getByLabel('First Name').fill('Updated');
      await editDialog.getByRole('button', { name: /^update$/i }).click();

      await expect(editDialog).toBeHidden({ timeout: 30_000 });

      await expect(page.getByRole('cell', { name: 'Updated', exact: true })).toBeVisible({ timeout: 30_000 });

      await row.getByTitle('Delete').click();
      const confirm = page.getByRole('dialog', { name: /confirm delete/i });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: /^delete$/i }).click();

      await expect(confirm).toBeHidden({ timeout: 30_000 });

      await expect(page.getByText(username)).toHaveCount(0, { timeout: 30_000 });
    } finally {
      await deleteByUsername(request, username);
    }
  });
});
