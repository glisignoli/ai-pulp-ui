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

async function apiPostJson<T>(request: APIRequestContext, url: string, body: unknown): Promise<{ status: number; json: T }> {
  const response = await request.post(url, { headers: apiHeaders(), data: body });
  const json = (await response.json()) as T;
  return { status: response.status(), json };
}

async function apiDelete(request: APIRequestContext, pulpHrefOrUrl: string) {
  const url = pulpHrefOrUrl.startsWith('http') ? pulpHrefOrUrl : `${API_ORIGIN}${pulpHrefOrUrl}`;
  const response = await request.delete(url, { headers: apiHeaders() });
  // Pulp typically returns 202 for async deletes, 204/200 for sync.
  expect([200, 202, 204, 404]).toContain(response.status());
}

async function deleteByName(request: APIRequestContext, endpoint: string, name: string) {
  const url = `${API_BASE}/${endpoint}/?name=${encodeURIComponent(name)}`;
  const data = await apiGetJson<{ results?: Array<{ pulp_href: string }> }>(request, url);
  for (const item of data.results ?? []) {
    await apiDelete(request, item.pulp_href);
  }
}

async function createRepository(request: APIRequestContext, name: string, description?: string) {
  const { status, json } = await apiPostJson<any>(request, `${API_BASE}/repositories/rpm/rpm/`, {
    name,
    description,
  });
  expect([200, 201, 202]).toContain(status);
  return json;
}

test.describe('RPM CRUD (Real API)', () => {
  test.describe.configure({ timeout: 180_000 });

  test('Repositories: create/edit/delete', async ({ page, request }) => {
    const repoName = uniqueName('pw-repo');

    try {
      await setAuthToken(page);
      await page.goto('/rpm/repository');

      await expect(page.getByRole('heading', { name: /rpm repositories/i })).toBeVisible();
      await page.getByRole('button', { name: /create repository/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(/create repository/i)).toBeVisible();

      await dialog.getByLabel(/name/i).fill(repoName);
      await dialog.getByLabel(/description/i).fill('desc-1');
      await dialog.getByRole('button', { name: /^create$/i }).click();

      await expect(page.getByRole('cell', { name: repoName, exact: true })).toBeVisible();

      const row = page.getByRole('row', { name: new RegExp(repoName, 'i') });
      await row.getByTitle('Edit').click();
      await expect(page.getByRole('dialog').getByText(/edit repository/i)).toBeVisible();

      const editDialog = page.getByRole('dialog');
      await editDialog.getByLabel(/description/i).fill('desc-2');
      await editDialog.getByRole('button', { name: /^update$/i }).click();

      await expect(page.getByRole('cell', { name: 'desc-2', exact: true })).toBeVisible();

      await row.getByTitle('Delete').click();
      const confirm = page.getByRole('dialog', { name: /confirm delete/i });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: /^delete$/i }).click();

      await expect(page.getByText(repoName)).toHaveCount(0);
    } finally {
      await deleteByName(request, 'repositories/rpm/rpm', repoName);
    }
  });

  test('Remotes: create/edit/delete', async ({ page, request }) => {
    const remoteName = uniqueName('pw-remote');

    try {
      await setAuthToken(page);
      await page.goto('/rpm/remote');

      await expect(page.getByRole('heading', { name: /rpm remotes/i })).toBeVisible();
      await page.getByRole('button', { name: /create remote/i }).click();

      const dialog = page.getByRole('dialog', { name: /create remote/i });
      await expect(dialog).toBeVisible();

      await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill(remoteName);
      await dialog.getByRole('textbox', { name: 'URL', exact: true }).fill('https://example.com/repo/');
      await dialog.getByRole('button', { name: /^create$/i }).click();

      await expect(page.getByRole('cell', { name: remoteName, exact: true })).toBeVisible();

      const row = page.getByRole('row', { name: new RegExp(remoteName, 'i') });
      await row.getByTitle('Edit').click();

      const editDialog = page.getByRole('dialog', { name: /edit remote/i });
      await expect(editDialog).toBeVisible();

      await editDialog
        .getByRole('textbox', { name: 'URL', exact: true })
        .fill('https://example.com/updated/');
      await editDialog.getByRole('button', { name: /^update$/i }).click();

      await expect(page.getByRole('cell', { name: 'https://example.com/updated/', exact: true })).toBeVisible();

      await row.getByTitle('Delete').click();
      const confirm = page.getByRole('dialog', { name: /confirm delete/i });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: /^delete$/i }).click();

      await expect(page.getByText(remoteName)).toHaveCount(0);
    } finally {
      await deleteByName(request, 'remotes/rpm/rpm', remoteName);
    }
  });

  test('Distributions: create/edit/delete', async ({ page, request }) => {
    const repoName = uniqueName('pw-dist-repo');
    const distName = uniqueName('pw-dist');
    let repoHref: string | undefined;

    try {
      const repo = await createRepository(request, repoName, 'repo for distribution');
      repoHref = repo.pulp_href;
      if (!repoHref) {
        throw new Error('Failed to create repository: missing pulp_href');
      }

      await setAuthToken(page);
      await page.goto('/rpm/distribution');

      await expect(page.getByRole('heading', { name: /rpm distributions/i })).toBeVisible();
      await page.getByRole('button', { name: /create distribution/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(/create distribution/i)).toBeVisible();

      await dialog.getByRole('textbox', { name: /^Name$/i }).fill(distName);
      await dialog.getByRole('textbox', { name: /^Base Path$/i }).fill(`dist/${distName}`);
      await dialog.getByRole('textbox', { name: /^Repository HREF$/i }).fill(repoHref);

      const createButton = dialog.getByRole('button', { name: /^create$/i });
      await expect(createButton).toBeEnabled();
      await createButton.click();

      await expect
        .poll(
          async () => {
            await page.reload();
            await page.waitForLoadState('networkidle');
            return await page.getByRole('cell', { name: distName, exact: true }).count();
          },
          { timeout: 60_000, intervals: [1000, 2000, 2000, 3000, 5000] }
        )
        .toBeGreaterThan(0);

      const row = page.getByRole('row', { name: new RegExp(distName, 'i') });
      await row.getByTitle('Edit').click();

      const editDialog = page.getByRole('dialog');
      await expect(editDialog.getByText(/edit distribution/i)).toBeVisible();

      await editDialog.getByLabel(/base path/i).fill(`dist/${distName}-updated`);
      await editDialog.getByRole('button', { name: /^update$/i }).click();

      await expect(page.getByRole('cell', { name: `dist/${distName}-updated`, exact: true })).toBeVisible();

      await row.getByTitle('Delete').click();
      const confirm = page.getByRole('dialog', { name: /confirm delete/i });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: /^delete$/i }).click();

      await expect(page.getByText(distName)).toHaveCount(0);
    } finally {
      await deleteByName(request, 'distributions/rpm/rpm', distName);
      if (repoName) await deleteByName(request, 'repositories/rpm/rpm', repoName);
    }
  });

  test('Publications: create/delete', async ({ page, request }) => {
    const repoName = uniqueName('pw-pub-repo');
    let repoHref: string | undefined;

    try {
      const repo = await createRepository(request, repoName, 'repo for publication');
      repoHref = repo.pulp_href;

      await setAuthToken(page);
      await page.goto('/rpm/publication');

      await expect(page.getByRole('heading', { name: /rpm publications/i })).toBeVisible();
      await page.getByRole('button', { name: /create publication/i }).click();

      const dialog = page.getByRole('dialog', { name: /create rpm publication/i });
      await expect(dialog).toBeVisible();

      const repoSelect = dialog
        .getByText(/^Repository \*$/)
        .first()
        .locator('..')
        .getByRole('combobox');
      await repoSelect.click();
      await page.getByRole('option', { name: repoName, exact: true }).click();

      await dialog.getByRole('button', { name: /^create$/i }).click();

      // Publication creation is async in Pulp; poll via UI refresh until it appears.
      await expect
        .poll(
          async () => {
            await page.reload();
            await page.waitForLoadState('networkidle');
            return await page.getByRole('cell', { name: repoName, exact: true }).count();
          },
          { timeout: 60_000, intervals: [1000, 2000, 2000, 3000, 5000] }
        )
        .toBeGreaterThan(0);

      const row = page.getByRole('row', { name: new RegExp(repoName, 'i') });
      await row.getByRole('button', { name: /^delete$/i }).click();

      const confirm = page.getByRole('dialog', { name: /confirm delete/i });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: /^delete$/i }).click();

      await expect(page.getByText(repoName)).toHaveCount(0);
    } finally {
      // Best-effort cleanup: delete any publications tied to this repo, then the repo itself.
      if (repoHref) {
        const pubs = await apiGetJson<{ results?: Array<{ pulp_href: string; repository?: string }> }>(
          request,
          `${API_BASE}/publications/rpm/rpm/?limit=200`
        );
        for (const pub of pubs.results ?? []) {
          if (pub.repository === repoHref) {
            await apiDelete(request, pub.pulp_href);
          }
        }
      }
      if (repoName) await deleteByName(request, 'repositories/rpm/rpm', repoName);
    }
  });
});
