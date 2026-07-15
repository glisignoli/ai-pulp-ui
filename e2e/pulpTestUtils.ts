import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const ADMIN_TOKEN = 'YWRtaW46cGFzc3dvcmQ='; // base64('admin:password')
export const API_ORIGIN = 'http://localhost:8080';
export const API_BASE = `${API_ORIGIN}/pulp/api/v3`;

// Base URL of the pulp-fixtures server *as seen from the Pulp backend*.
// tests/run_container.sh exports PULP_FIXTURES_URL pointing at the fixtures
// container's bridge IP; localhost:8081 is the fallback for a host-local backend.
export const FIXTURES_URL = (process.env.PULP_FIXTURES_URL || 'http://localhost:8081').replace(/\/+$/, '');

const PAGE_READY_TIMEOUT = 30_000;

export function uniqueName(prefix: string) {
  const rand = Math.random().toString(16).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

export async function setAuthToken(page: Page) {
  await page.addInitScript((token: string) => {
    localStorage.setItem('authToken', token);
  }, ADMIN_TOKEN);
}

export async function waitForPageReady(page: Page) {
  await page
    .waitForSelector('[role="progressbar"]', { state: 'detached', timeout: PAGE_READY_TIMEOUT })
    .catch(() => {});
}

export async function reloadAndWait(page: Page) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageReady(page);
}

export function apiHeaders() {
  return {
    Authorization: `Basic ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export function apiUrl(hrefOrUrl: string) {
  return hrefOrUrl.startsWith('http') ? hrefOrUrl : `${API_ORIGIN}${hrefOrUrl}`;
}

export async function apiGetJson<T>(request: APIRequestContext, hrefOrUrl: string): Promise<T> {
  const url = apiUrl(hrefOrUrl);
  const response = await request.get(url, { headers: apiHeaders() });
  expect(response.ok(), `GET ${url} failed: ${response.status()}`).toBeTruthy();
  return (await response.json()) as T;
}

/** Best-effort delete for cleanup paths; never throws on HTTP errors. */
export async function apiDeleteQuiet(request: APIRequestContext, hrefOrUrl: string) {
  await request.delete(apiUrl(hrefOrUrl), { headers: apiHeaders() }).catch(() => {});
}

/**
 * Best-effort cleanup of every resource on `endpoint` (an API-relative path such as
 * '/repositories/gem/gem/') whose name matches exactly.
 */
export async function deleteByName(request: APIRequestContext, endpoint: string, name: string) {
  const url = `${API_BASE}${endpoint}?name=${encodeURIComponent(name)}`;
  const response = await request.get(url, { headers: apiHeaders() }).catch(() => null);
  if (!response || !response.ok()) return;
  const data = (await response.json()) as { results?: Array<{ pulp_href: string }> };
  for (const item of data.results ?? []) {
    await apiDeleteQuiet(request, item.pulp_href);
  }
}

let componentsCache: Set<string> | null = null;

/** Installed Pulp plugin components (e.g. 'rpm', 'gem', 'npm') from the status API. */
export async function getInstalledComponents(request: APIRequestContext): Promise<Set<string>> {
  if (!componentsCache) {
    const status = await apiGetJson<{ versions: Array<{ component: string }> }>(
      request,
      `${API_BASE}/status/`
    );
    componentsCache = new Set(status.versions.map((v) => v.component));
  }
  return componentsCache;
}

export interface PulpTask {
  pulp_href: string;
  state: string;
  error?: { description?: string; traceback?: string } | null;
}

/** Poll a task href until it reaches a final state; fail the test if it didn't complete. */
export async function waitForTaskCompletion(
  request: APIRequestContext,
  taskHref: string,
  timeoutMs = 120_000
) {
  const deadline = Date.now() + timeoutMs;
  let task = await apiGetJson<PulpTask>(request, taskHref);
  while (!['completed', 'failed', 'canceled'].includes(task.state)) {
    expect(Date.now(), `Task ${taskHref} still ${task.state} after ${timeoutMs}ms`).toBeLessThan(deadline);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    task = await apiGetJson<PulpTask>(request, taskHref);
  }
  expect(
    task.state,
    `Task ${taskHref} finished as ${task.state}: ${task.error?.description ?? 'no error description'}`
  ).toBe('completed');
  return task;
}

/** Look up a single resource href by exact name, polling until it exists. */
export async function findHrefByName(
  request: APIRequestContext,
  endpoint: string,
  name: string,
  timeoutMs = 30_000
): Promise<string> {
  const url = `${API_BASE}${endpoint}?name=${encodeURIComponent(name)}`;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const data = await apiGetJson<{ results?: Array<{ pulp_href: string }> }>(request, url);
    if (data.results?.length) return data.results[0].pulp_href;
    expect(Date.now(), `${name} never appeared at ${endpoint}`).toBeLessThan(deadline);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
