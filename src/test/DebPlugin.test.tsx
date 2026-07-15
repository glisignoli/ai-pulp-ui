import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PluginRemote, PluginPublication, PluginRepository } from '../components/plugin';
import { DEB_PLUGIN } from '../constants/plugins';
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

describe('DEB plugin via generic components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the distributions column in the remote list', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/remotes/deb/apt/1/',
          name: 'deb-remote-1',
          url: 'https://example.org/debian',
          distributions: 'stable',
        },
      ],
    } as any);

    render(
      <MemoryRouter>
        <PluginRemote plugin={DEB_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DEB Remotes')).toBeInTheDocument();
      expect(screen.getByText('deb-remote-1')).toBeInTheDocument();
      expect(screen.getByText('stable')).toBeInTheDocument();
    });
  });

  it('requires the distributions field when creating a remote', async () => {
    vi.mocked(apiService.get).mockResolvedValue(emptyList as any);

    render(
      <MemoryRouter>
        <PluginRemote plugin={DEB_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create remote/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create remote/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'deb-remote' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://deb.example.com/' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(within(dialog).getByText(/distributions is required/i)).toBeInTheDocument();
    });
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('creates a remote with the APT-specific fields', async () => {
    vi.mocked(apiService.get).mockResolvedValue(emptyList as any);
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginRemote plugin={DEB_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create remote/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create remote/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'deb-remote' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://deb.example.com/' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Distributions' }), {
      target: { value: 'stable bookworm' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Components' }), {
      target: { value: 'main' },
    });
    fireEvent.click(within(dialog).getByLabelText('Sync Udebs'));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/remotes/deb/apt/', {
        name: 'deb-remote',
        url: 'https://deb.example.com/',
        policy: 'immediate',
        tls_validation: true,
        distributions: 'stable bookworm',
        components: 'main',
        sync_sources: false,
        sync_udebs: true,
        sync_installer: false,
        ignore_missing_package_indices: false,
      });
    });
  }, 20000);

  it('does not offer the dropped retain_package_versions field on repositories', async () => {
    vi.mocked(apiService.get).mockResolvedValue(emptyList as any);

    render(
      <MemoryRouter>
        <PluginRepository plugin={DEB_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create repository/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create repository/i }));
    const dialog = await screen.findByRole('dialog');

    // pulp_deb's AptRepository has no retain_package_versions field.
    expect(within(dialog).queryByLabelText(/retain package versions/i)).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Auto-publish')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Signing Service')).toBeInTheDocument();
  });

  it('creates a publication with structured publishing enabled by default', async () => {
    const repoHref = '/pulp/api/v3/repositories/deb/apt/1/';
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/repositories/deb/apt/')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [{ pulp_href: repoHref, name: 'deb-repo' }],
        } as any);
      }
      return Promise.resolve(emptyList as any);
    });
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginPublication plugin={DEB_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create publication/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create publication/i }));
    const dialog = await screen.findByRole('dialog');

    const repoInput = within(dialog).getByRole('combobox', { name: 'Repository' });
    fireEvent.keyDown(repoInput, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('deb-repo'));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/publications/deb/apt/', {
        repository: repoHref,
        simple: false,
        structured: true,
        checkpoint: false,
        publish_upstream_release_fields: false,
      });
    });
  });
});
