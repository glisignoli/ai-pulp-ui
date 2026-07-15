import { test, expect, type Page } from '@playwright/test';
import { CONTENT_PLUGINS, pluginRoutePaths } from '../src/constants/plugins';
import {
  deleteByName,
  findHrefByName,
  getInstalledComponents,
  reloadAndWait,
  setAuthToken,
  uniqueName,
  waitForPageReady,
  waitForTaskCompletion,
} from './pulpTestUtils';

/**
 * Lifecycle coverage for the config-driven plugin pages added in a3bdae8
 * (Ansible, Gem, Hugging Face, Maven, NPM, OSTree, Python, Rust): create a
 * remote, a repository attached to it, a distribution, and (where supported)
 * a publication through the UI, then verify the repository detail view and
 * delete the distribution through the UI.
 */

const POLL_OPTS = { timeout: 60_000, intervals: [1000, 2000, 2000, 3000, 5000] };

// pulp_hugging_face 0.3.0 rejects attaching its own remote to a repository
// ("Type for Remote ... does not match Repository.") even via the raw API, so
// the repository is created without a remote for that plugin.
const REMOTE_ATTACH_BROKEN = new Set(['hugging_face']);

// pulp_hugging_face 0.3.0 also returns HTTP 500 for POST /publications/... via
// the raw API, so only the publications list page is checked for that plugin.
const PUBLICATION_CREATE_BROKEN = new Set(['hugging_face']);

async function pollForCell(page: Page, name: string | RegExp, expected: 'present' | 'absent') {
  await expect
    .poll(async () => {
      await reloadAndWait(page);
      return await page.getByRole('cell', { name, exact: typeof name === 'string' }).count();
    }, POLL_OPTS)
    [expected === 'present' ? 'toBeGreaterThan' : 'toBe'](0);
}

for (const plugin of CONTENT_PLUGINS) {
  const paths = pluginRoutePaths(plugin);

  test.describe(`${plugin.label} plugin pages`, () => {
    test.describe.configure({ timeout: 240_000 });

    test.beforeEach(async ({ page, request }) => {
      const components = await getInstalledComponents(request);
      test.skip(!components.has(plugin.key), `${plugin.key} plugin is not installed in this Pulp`);
      await setAuthToken(page);
    });

    test('remote, repository, distribution and publication lifecycle', async ({ page, request }) => {
      const remoteName = uniqueName(`pw-${plugin.key}-remote`);
      const repoName = uniqueName(`pw-${plugin.key}-repo`);
      const distName = uniqueName(`pw-${plugin.key}-dist`);
      // Exercise a non-default download policy when the plugin offers more than one.
      const policy = plugin.remotePolicies[plugin.remotePolicies.length - 1];

      try {
        // --- Remote ---
        await page.goto(paths.remote, { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
        await expect(page.getByRole('heading', { name: `${plugin.label} Remotes` })).toBeVisible();

        await page.getByRole('button', { name: /create remote/i }).click();
        const remoteDialog = page.getByRole('dialog');
        await remoteDialog.getByRole('textbox', { name: 'Name', exact: true }).fill(remoteName);
        await remoteDialog
          .getByRole('textbox', { name: 'URL', exact: true })
          .fill(`https://example.com/${plugin.key}/`);
        if (plugin.remotePolicies.length > 1) {
          await remoteDialog.getByRole('combobox', { name: /policy/i }).click();
          await page.getByRole('option', { name: policy, exact: true }).click();
        }

        const [remoteResponse] = await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.request().method() === 'POST' && resp.url().includes(plugin.endpoints.remotes)
          ),
          remoteDialog.getByRole('button', { name: /^create$/i }).click(),
        ]);
        expect(
          remoteResponse.ok(),
          `Create ${plugin.key} remote failed: HTTP ${remoteResponse.status()} ${await remoteResponse.text()}`
        ).toBeTruthy();

        await pollForCell(page, remoteName, 'present');
        // The list should show the policy that was selected.
        const remoteRow = page.getByRole('row', { name: new RegExp(remoteName) });
        await expect(remoteRow.getByRole('cell', { name: policy, exact: true })).toBeVisible();

        // --- Repository attached to the remote ---
        await page.goto(paths.repository, { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
        await expect(page.getByRole('heading', { name: `${plugin.label} Repositories` })).toBeVisible();

        await page.getByRole('button', { name: /create repository/i }).click();
        const repoDialog = page.getByRole('dialog');
        await repoDialog.getByRole('textbox', { name: 'Name', exact: true }).fill(repoName);
        await repoDialog.getByRole('textbox', { name: 'Description', exact: true }).fill('e2e plugin repo');
        const attachRemote = !REMOTE_ATTACH_BROKEN.has(plugin.key);
        if (attachRemote) {
          const remoteSelect = repoDialog.getByRole('combobox', { name: 'Remote' });
          await remoteSelect.click();
          await remoteSelect.fill(remoteName);
          await page.getByRole('option', { name: remoteName, exact: true }).click();
        }

        const [repoResponse] = await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.request().method() === 'POST' && resp.url().includes(plugin.endpoints.repositories)
          ),
          repoDialog.getByRole('button', { name: /^create$/i }).click(),
        ]);
        expect(
          repoResponse.ok(),
          `Create ${plugin.key} repository failed: HTTP ${repoResponse.status()} ${await repoResponse.text()}`
        ).toBeTruthy();

        await pollForCell(page, repoName, 'present');
        if (attachRemote) {
          // The repository list resolves the remote href back to its name.
          const repoRow = page.getByRole('row', { name: new RegExp(repoName) });
          await expect(repoRow.getByRole('cell', { name: remoteName, exact: true })).toBeVisible();
        }

        const repoHref = await findHrefByName(request, plugin.endpoints.repositories, repoName);

        // --- Repository detail view ---
        await page.goto(`${paths.repositoryView}?href=${encodeURIComponent(repoHref)}`, {
          waitUntil: 'domcontentloaded',
        });
        await waitForPageReady(page);
        await expect(page.getByRole('heading', { name: `${plugin.label} Repository` })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'GET Result' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Repository Versions' })).toBeVisible();
        // A fresh repository always has version 0.
        await expect(page.getByRole('cell', { name: '0', exact: true })).toBeVisible();
        // The sync button only exists for plugins that support syncing (all but
        // Maven) and only when the repository has a remote attached.
        await expect(page.getByRole('button', { name: /^sync$/i })).toHaveCount(
          plugin.hasSync && attachRemote ? 1 : 0
        );

        // --- Distribution ---
        await page.goto(paths.distribution, { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
        await expect(page.getByRole('heading', { name: `${plugin.label} Distributions` })).toBeVisible();

        await page.getByRole('button', { name: /create distribution/i }).click();
        const distDialog = page.getByRole('dialog');
        await distDialog.getByRole('textbox', { name: 'Name', exact: true }).fill(distName);
        await distDialog.getByRole('textbox', { name: 'Base Path', exact: true }).fill(`pw/${distName}`);
        const distRepoSelect = distDialog.getByRole('combobox', { name: 'Repository' });
        await distRepoSelect.click();
        await distRepoSelect.fill(repoName);
        await page.getByRole('option', { name: repoName, exact: true }).click();

        const [distResponse] = await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.request().method() === 'POST' && resp.url().includes(plugin.endpoints.distributions)
          ),
          distDialog.getByRole('button', { name: /^create$/i }).click(),
        ]);
        expect(
          distResponse.ok(),
          `Create ${plugin.key} distribution failed: HTTP ${distResponse.status()} ${await distResponse.text()}`
        ).toBeTruthy();
        // Distribution creation is a task; wait for it so the list poll can't race it.
        const distTask = (await distResponse.json()) as { task?: string };
        if (distTask.task) await waitForTaskCompletion(request, distTask.task);

        await pollForCell(page, distName, 'present');

        // --- Publication (only Gem, Python and Hugging Face support them) ---
        if (plugin.endpoints.publications) {
          await page.goto(paths.publication, { waitUntil: 'domcontentloaded' });
          await waitForPageReady(page);
          await expect(page.getByRole('heading', { name: `${plugin.label} Publications` })).toBeVisible();

          if (!PUBLICATION_CREATE_BROKEN.has(plugin.key)) {
            await page.getByRole('button', { name: /create publication/i }).click();
            const pubDialog = page.getByRole('dialog');
            const pubRepoSelect = pubDialog.getByRole('combobox', { name: 'Repository', exact: true });
            await pubRepoSelect.click();
            await pubRepoSelect.fill(repoName);
            await page.getByRole('option', { name: repoName, exact: true }).click();

            const [pubResponse] = await Promise.all([
              page.waitForResponse(
                (resp) =>
                  resp.request().method() === 'POST' && resp.url().includes(plugin.endpoints.publications!)
              ),
              pubDialog.getByRole('button', { name: /^create$/i }).click(),
            ]);
            expect(
              pubResponse.ok(),
              `Create ${plugin.key} publication failed: HTTP ${pubResponse.status()} ${await pubResponse.text()}`
            ).toBeTruthy();
            const pubTask = (await pubResponse.json()) as { task?: string };
            if (pubTask.task) await waitForTaskCompletion(request, pubTask.task);

            // The list shows the repository name (or the repository_version href,
            // which embeds the repository href) for the new publication.
            const repoRef = new RegExp(`${repoName}|${repoHref.replace(/[/]/g, '[/]')}`);
            await pollForCell(page, repoRef, 'present');
          }
        }

        // --- Delete the distribution through the UI confirm dialog ---
        await page.goto(paths.distribution, { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
        const distRow = page.getByRole('row', { name: new RegExp(distName) });
        await distRow.getByTitle('Delete').click();
        const confirm = page.getByRole('dialog', { name: /confirm delete/i });
        await expect(confirm).toBeVisible();
        await confirm.getByRole('button', { name: /^delete$/i }).click();

        await pollForCell(page, distName, 'absent');
      } finally {
        // Best-effort cleanup; publications are removed with their repository.
        await deleteByName(request, plugin.endpoints.distributions, distName);
        await deleteByName(request, plugin.endpoints.repositories, repoName);
        await deleteByName(request, plugin.endpoints.remotes, remoteName);
      }
    });
  });
}
