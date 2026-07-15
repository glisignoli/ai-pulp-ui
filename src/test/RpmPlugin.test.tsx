import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PluginRemote, PluginRepository, PluginPublication } from '../components/plugin';
import { RPM_PLUGIN } from '../constants/plugins';
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

describe('RPM plugin via generic components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('remote dialog exposes the common pulpcore options and the SLES token', async () => {
    vi.mocked(apiService.get).mockResolvedValue(emptyList as any);

    render(
      <MemoryRouter>
        <PluginRemote plugin={RPM_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('RPM Remotes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /create remote/i }));
    const dialog = await screen.findByRole('dialog');

    // Plugin-specific field.
    expect(within(dialog).getByLabelText(/sles auth token/i)).toBeInTheDocument();
    // Common options from the pulpcore Remote serializer.
    expect(within(dialog).getByLabelText(/proxy url/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/proxy username/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/ca certificate/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/download concurrency/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/socket read timeout/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/headers \(json\)/i)).toBeInTheDocument();
  });

  it('creates a remote with sles token and proxy settings', async () => {
    vi.mocked(apiService.get).mockResolvedValue(emptyList as any);
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginRemote plugin={RPM_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create remote/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create remote/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'rpm-remote' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://example.com/rpm/' },
    });
    fireEvent.change(within(dialog).getByLabelText(/sles auth token/i), {
      target: { value: 'token-1' },
    });
    fireEvent.change(within(dialog).getByLabelText(/proxy url/i), {
      target: { value: 'http://proxy:3128' },
    });
    fireEvent.change(within(dialog).getByLabelText(/download concurrency/i), {
      target: { value: '5' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/remotes/rpm/rpm/', {
        name: 'rpm-remote',
        url: 'https://example.com/rpm/',
        policy: 'immediate',
        tls_validation: true,
        sles_auth_token: 'token-1',
        proxy_url: 'http://proxy:3128',
        download_concurrency: 5,
      });
    });
  });

  it('rejects a download concurrency below 1', async () => {
    vi.mocked(apiService.get).mockResolvedValue(emptyList as any);

    render(
      <MemoryRouter>
        <PluginRemote plugin={RPM_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create remote/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create remote/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'r' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://example.com/' },
    });
    fireEvent.change(within(dialog).getByLabelText(/download concurrency/i), {
      target: { value: '0' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      // Shown both inline under the field and in the dialog's error alert.
      expect(within(dialog).getAllByText(/download concurrency must be >= 1/i).length).toBeGreaterThan(0);
    });
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('creates a repository with RPM-specific publish options', async () => {
    vi.mocked(apiService.get).mockResolvedValue(emptyList as any);
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginRepository plugin={RPM_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create repository/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create repository/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'rpm-repo' },
    });
    fireEvent.click(within(dialog).getByLabelText('Auto-publish'));
    fireEvent.change(within(dialog).getByLabelText(/retain package versions/i), {
      target: { value: '3' },
    });

    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /checksum type/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'sha256' }));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/repositories/rpm/rpm/', {
        name: 'rpm-repo',
        description: null,
        retain_repo_versions: null,
        remote: null,
        autopublish: true,
        retain_package_versions: 3,
        checksum_type: 'sha256',
      });
    });
  });

  it('creates a publication with checkpoint and layout options', async () => {
    const repoHref = '/pulp/api/v3/repositories/rpm/rpm/1/';
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/repositories/rpm/rpm/')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [{ pulp_href: repoHref, name: 'rpm-repo' }],
        } as any);
      }
      return Promise.resolve(emptyList as any);
    });
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginPublication plugin={RPM_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create publication/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create publication/i }));
    const dialog = await screen.findByRole('dialog');

    const repoInput = within(dialog).getByRole('combobox', { name: 'Repository' });
    fireEvent.keyDown(repoInput, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('rpm-repo'));

    fireEvent.click(within(dialog).getByLabelText('Checkpoint'));
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /layout/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'flat' }));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/publications/rpm/rpm/', {
        repository: repoHref,
        checkpoint: true,
        layout: 'flat',
      });
    });
  });
});
