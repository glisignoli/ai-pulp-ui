import { test, expect, type Page } from '@playwright/test';
import {
  FIXTURES_URL,
  apiGetJson,
  deleteByName,
  findHrefByName,
  getInstalledComponents,
  setAuthToken,
  uniqueName,
  waitForPageReady,
  waitForTaskCompletion,
} from './pulpTestUtils';

/**
 * End-to-end remote + sync coverage against the pulp-fixtures server
 * (started on port 8081 by tests/run_container.sh, which exports
 * PULP_FIXTURES_URL with an address the Pulp backend can reach).
 *
 * For every download policy a plugin supports, this creates a remote pointing
 * at a fixture repository, creates a repository attached to it, triggers a
 * sync from the repository detail page, and verifies the sync task completes
 * and repository version 1 shows up in the UI.
 *
 * Covers both UI implementations: the dedicated RPM/DEB components and the
 * generic config-driven components (via Gem).
 */

type Policy = 'immediate' | 'on_demand' | 'streamed';

interface SyncTarget {
  /** Pulp component name from the status API, also used in test names. */
  component: string;
  label: string;
  remoteListPath: string;
  repoListPath: string;
  repoViewPath: string;
  remotesEndpoint: string;
  repositoriesEndpoint: string;
  fixtureUrl: string;
  policies: Policy[];
  /** How the policy is labelled in this plugin's create-remote dialog. */
  policyOptionName: (policy: Policy) => string | RegExp;
  /** Extra dialog fields required by this plugin's remote. */
  fillExtraRemoteFields?: (page: Page) => Promise<void>;
}

// The dedicated RPM/DEB dialogs use verbose policy labels; the generic
// plugin dialog uses the raw policy value.
const VERBOSE_POLICY_LABELS: Record<Policy, RegExp> = {
  immediate: /^Immediate \(/,
  on_demand: /^On Demand \(/,
  streamed: /^Streamed \(/,
};

const SYNC_TARGETS: SyncTarget[] = [
  {
    component: 'rpm',
    label: 'RPM',
    remoteListPath: '/rpm/remote',
    repoListPath: '/rpm/repository',
    repoViewPath: '/rpm/repository/view',
    remotesEndpoint: '/remotes/rpm/rpm/',
    repositoriesEndpoint: '/repositories/rpm/rpm/',
    fixtureUrl: `${FIXTURES_URL}/rpm-unsigned/`,
    policies: ['immediate', 'on_demand', 'streamed'],
    policyOptionName: (policy) => VERBOSE_POLICY_LABELS[policy],
  },
  {
    component: 'deb',
    label: 'DEB',
    remoteListPath: '/deb/remote',
    repoListPath: '/deb/repository',
    repoViewPath: '/deb/repository/view',
    remotesEndpoint: '/remotes/deb/apt/',
    repositoriesEndpoint: '/repositories/deb/apt/',
    fixtureUrl: `${FIXTURES_URL}/debian/`,
    policies: ['immediate'],
    policyOptionName: (policy) => VERBOSE_POLICY_LABELS[policy],
    fillExtraRemoteFields: async (page) => {
      await page
        .getByRole('dialog')
        .getByRole('textbox', { name: 'Distributions', exact: true })
        .fill('ragnarok');
    },
  },
  {
    // Exercises the generic config-driven components from src/components/plugin/.
    component: 'gem',
    label: 'Gem',
    remoteListPath: '/gem/remote',
    repoListPath: '/gem/repository',
    repoViewPath: '/gem/repository/view',
    remotesEndpoint: '/remotes/gem/gem/',
    repositoriesEndpoint: '/repositories/gem/gem/',
    fixtureUrl: `${FIXTURES_URL}/gem/`,
    policies: ['immediate', 'on_demand', 'streamed'],
    policyOptionName: (policy) => policy,
  },
];

for (const target of SYNC_TARGETS) {
  for (const policy of target.policies) {
    test.describe(`${target.label} sync (${policy})`, () => {
      test.describe.configure({ timeout: 300_000 });

      test.beforeEach(async ({ page, request }) => {
        const components = await getInstalledComponents(request);
        test.skip(
          !components.has(target.component),
          `${target.component} plugin is not installed in this Pulp`
        );
        await setAuthToken(page);
      });

      test(`create remote and repository, sync from fixtures`, async ({ page, request }) => {
        const remoteName = uniqueName(`pw-sync-${target.component}-${policy}`);
        const repoName = uniqueName(`pw-sync-${target.component}-${policy}-repo`);

        try {
          // --- Create the remote pointing at the fixture repository ---
          await page.goto(target.remoteListPath, { waitUntil: 'domcontentloaded' });
          await waitForPageReady(page);
          await page.getByRole('button', { name: /create remote/i }).click();

          const remoteDialog = page.getByRole('dialog');
          await remoteDialog.getByRole('textbox', { name: 'Name', exact: true }).fill(remoteName);
          await remoteDialog.getByRole('textbox', { name: 'URL', exact: true }).fill(target.fixtureUrl);
          // The MUI select's accessible name is "Policy <current value>".
          await remoteDialog.getByRole('combobox', { name: /^Policy/ }).click();
          await page.getByRole('option', { name: target.policyOptionName(policy) }).click();
          await target.fillExtraRemoteFields?.(page);

          const [remoteResponse] = await Promise.all([
            page.waitForResponse(
              (resp) => resp.request().method() === 'POST' && resp.url().includes(target.remotesEndpoint)
            ),
            remoteDialog.getByRole('button', { name: /^create$/i }).click(),
          ]);
          expect(
            remoteResponse.ok(),
            `Create remote failed: HTTP ${remoteResponse.status()} ${await remoteResponse.text()}`
          ).toBeTruthy();
          const created = (await remoteResponse.json()) as { policy?: string };
          expect(created.policy, 'remote was not created with the selected policy').toBe(policy);

          // --- Create a repository attached to the remote ---
          await page.goto(target.repoListPath, { waitUntil: 'domcontentloaded' });
          await waitForPageReady(page);
          await page.getByRole('button', { name: /create repository/i }).click();

          const repoDialog = page.getByRole('dialog');
          await repoDialog.getByRole('textbox', { name: 'Name', exact: true }).fill(repoName);
          const remoteSelect = repoDialog.getByRole('combobox', { name: 'Remote' });
          await remoteSelect.click();
          await remoteSelect.fill(remoteName);
          await page.getByRole('option', { name: remoteName, exact: true }).click();

          const [repoResponse] = await Promise.all([
            page.waitForResponse(
              (resp) =>
                resp.request().method() === 'POST' && resp.url().includes(target.repositoriesEndpoint)
            ),
            repoDialog.getByRole('button', { name: /^create$/i }).click(),
          ]);
          expect(
            repoResponse.ok(),
            `Create repository failed: HTTP ${repoResponse.status()} ${await repoResponse.text()}`
          ).toBeTruthy();

          const repoHref = await findHrefByName(request, target.repositoriesEndpoint, repoName);

          // --- Sync from the repository detail page ---
          await page.goto(`${target.repoViewPath}?href=${encodeURIComponent(repoHref)}`, {
            waitUntil: 'domcontentloaded',
          });
          await waitForPageReady(page);

          const syncButton = page.getByRole('button', { name: /^sync$/i });
          await expect(syncButton).toBeVisible();

          const [syncResponse] = await Promise.all([
            page.waitForResponse(
              (resp) => resp.request().method() === 'POST' && resp.url().includes(`${repoHref}sync/`)
            ),
            syncButton.click(),
          ]);
          expect(
            syncResponse.ok(),
            `Sync request failed: HTTP ${syncResponse.status()} ${await syncResponse.text()}`
          ).toBeTruthy();

          // The sync endpoint returns a task; it must complete, not just start.
          const { task } = (await syncResponse.json()) as { task: string };
          expect(task, 'sync response did not contain a task href').toBeTruthy();
          await waitForTaskCompletion(request, task, 240_000);

          // A completed sync of a non-empty fixture repo produces version 1.
          const versions = await apiGetJson<{ count: number }>(
            request,
            `${repoHref}versions/?number=1`
          );
          expect(versions.count, 'sync completed but repository version 1 was not created').toBe(1);

          // And the detail page's versions table shows it after a reload.
          await page.reload({ waitUntil: 'domcontentloaded' });
          await waitForPageReady(page);
          await expect(page.getByRole('cell', { name: '1', exact: true })).toBeVisible();
        } finally {
          await deleteByName(request, target.repositoriesEndpoint, repoName);
          await deleteByName(request, target.remotesEndpoint, remoteName);
        }
      });
    });
  }
}
