import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PluginRepository } from '../components/plugin/PluginRepository';
import { getPlugin } from '../constants/plugins';
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

const gem = getPlugin('gem');

describe('PluginRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <PluginRepository plugin={gem} />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders repositories after loading', async () => {
    const repoHref = '/pulp/api/v3/repositories/gem/gem/1/';
    const remoteHref = '/pulp/api/v3/remotes/gem/gem/9/';

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/repositories/gem/gem/')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: repoHref,
              name: 'test-gem-repo',
              description: 'Test gem repository',
              retain_repo_versions: 2,
              remote: remoteHref,
            },
          ],
        } as any);
      }
      if (url.startsWith('/remotes/gem/gem/')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [{ pulp_href: remoteHref, name: 'gem-remote', url: 'https://rubygems.org' }],
        } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    render(
      <MemoryRouter>
        <PluginRepository plugin={gem} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Gem Repositories')).toBeInTheDocument();
      expect(screen.getByText('test-gem-repo')).toBeInTheDocument();
      expect(screen.getByText('Test gem repository')).toBeInTheDocument();
      expect(screen.getByText('gem-remote')).toBeInTheDocument();
    });
  });

  it('creates a new repository with expected payload', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ count: 0, next: null, previous: null, results: [] } as any);
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginRepository plugin={gem} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Repository' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Repository' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /name/i }), {
      target: { value: 'new-gem-repo' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /description/i }), {
      target: { value: 'New gem repo description' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/repositories/gem/gem/', {
        name: 'new-gem-repo',
        description: 'New gem repo description',
        retain_repo_versions: null,
        remote: null,
      });
    });
  });
});
