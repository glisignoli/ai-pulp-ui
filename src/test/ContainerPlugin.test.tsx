import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PluginRemote, PluginDistribution, PluginResourceDetail } from '../components/plugin';
import { CONTAINER_PLUGIN } from '../constants/plugins';
import { apiService } from '../services/api';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    apiService: {
      ...actual.apiService,
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const emptyList = { count: 0, next: null, previous: null, results: [] };

describe('Container plugin via generic components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires upstream name when creating a remote', async () => {
    vi.mocked(apiService.get).mockResolvedValue(emptyList as any);

    render(
      <MemoryRouter>
        <PluginRemote plugin={CONTAINER_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Container Remotes')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create remote/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'registry' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://registry-1.docker.io' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(within(dialog).getByText(/upstream name is required/i)).toBeInTheDocument();
    });
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('creates a remote and parses the tag lists', async () => {
    vi.mocked(apiService.get).mockResolvedValue(emptyList as any);
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginRemote plugin={CONTAINER_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create remote/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create remote/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'registry' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://registry-1.docker.io' },
    });
    fireEvent.change(within(dialog).getByLabelText(/upstream name/i), {
      target: { value: 'library/nginx' },
    });
    fireEvent.change(within(dialog).getByLabelText(/include tags/i), {
      target: { value: 'latest\nv3.*' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/remotes/container/container/', {
        name: 'registry',
        url: 'https://registry-1.docker.io',
        policy: 'immediate',
        tls_validation: true,
        upstream_name: 'library/nginx',
        include_tags: ['latest', 'v3.*'],
      });
    });
  });

  it('creates a distribution with container-specific fields, repository taking precedence', async () => {
    const repoHref = '/pulp/api/v3/repositories/container/container/1/';
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/repositories/container/container/')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [{ pulp_href: repoHref, name: 'container-repo' }],
        } as any);
      }
      return Promise.resolve(emptyList as any);
    });
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginDistribution plugin={CONTAINER_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Container Distributions')).toBeInTheDocument();
    });
    // Container-specific list columns.
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create distribution/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'nginx' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Base Path' }), {
      target: { value: 'nginx' },
    });

    const repoInput = within(dialog).getByRole('combobox', { name: 'Repository' });
    fireEvent.keyDown(repoInput, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('container-repo'));

    // Both repository and repository_version set: repository wins.
    fireEvent.change(within(dialog).getByLabelText(/repository version \(href\)/i), {
      target: { value: '/pulp/api/v3/repositories/container/container/1/versions/1/' },
    });
    fireEvent.click(within(dialog).getByLabelText('Private'));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/distributions/container/container/', {
        name: 'nginx',
        base_path: 'nginx',
        repository: repoHref,
        repository_version: null,
        private: true,
        content_guard: null,
        hidden: false,
      });
    });
  });

  it('repository detail offers sync when a remote is attached', async () => {
    const repoHref = '/pulp/api/v3/repositories/container/container/1/';
    const remoteHref = '/pulp/api/v3/remotes/container/container/1/';
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === repoHref) {
        return Promise.resolve({
          pulp_href: repoHref,
          name: 'container-repo',
          remote: remoteHref,
          versions_href: `${repoHref}versions/`,
        } as any);
      }
      return Promise.resolve(emptyList as any);
    });
    vi.mocked(apiService.post).mockResolvedValue({ task: '/pulp/api/v3/tasks/1/' } as any);

    render(
      <MemoryRouter initialEntries={[`/container/repository/view?href=${encodeURIComponent(repoHref)}`]}>
        <Routes>
          <Route
            path="/container/repository/view"
            element={<PluginResourceDetail plugin={CONTAINER_PLUGIN} resource="repository" />}
          />
        </Routes>
      </MemoryRouter>
    );

    const syncButton = await screen.findByRole('button', { name: 'Sync' });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith(`${repoHref}sync/`, { remote: remoteHref });
    });
  });

  it('repository detail offers editing via the shared form dialog', async () => {
    const repoHref = '/pulp/api/v3/repositories/container/container/1/';
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === repoHref) {
        return Promise.resolve({
          pulp_href: repoHref,
          name: 'container-repo',
          description: 'before',
          versions_href: `${repoHref}versions/`,
        } as any);
      }
      return Promise.resolve(emptyList as any);
    });
    vi.mocked(apiService.put).mockResolvedValue({} as any);

    render(
      <MemoryRouter initialEntries={[`/container/repository/view?href=${encodeURIComponent(repoHref)}`]}>
        <Routes>
          <Route
            path="/container/repository/view"
            element={<PluginResourceDetail plugin={CONTAINER_PLUGIN} resource="repository" />}
          />
        </Routes>
      </MemoryRouter>
    );

    const editButton = await screen.findByRole('button', { name: 'Edit' });
    fireEvent.click(editButton);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit Repository')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/manifest signing service/i)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Description' }), {
      target: { value: 'after' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith(repoHref, {
        name: 'container-repo',
        description: 'after',
        retain_repo_versions: null,
        remote: null,
      });
    });
  });
});
