import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PluginResourceDetail } from '../components/plugin/PluginResourceDetail';
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
const maven = getPlugin('maven');

const renderDetail = (plugin: typeof gem, resource: 'repository' | 'remote', href: string) =>
  render(
    <MemoryRouter initialEntries={[`${plugin.routeBase}/${resource}/view?href=${encodeURIComponent(href)}`]}>
      <PluginResourceDetail plugin={plugin} resource={resource} />
    </MemoryRouter>
  );

describe('PluginResourceDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an error when href is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/gem/repository/view']}>
        <PluginResourceDetail plugin={gem} resource="repository" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Missing repository href')).toBeInTheDocument();
    });
  });

  it('renders a repository with versions and sync button', async () => {
    const href = '/pulp/api/v3/repositories/gem/gem/1/';

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === href) {
        return Promise.resolve({
          pulp_href: href,
          name: 'gem-repo',
          remote: '/pulp/api/v3/remotes/gem/gem/1/',
          versions_href: `${href}versions/`,
        } as any);
      }
      if (url === `${href}versions/`) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [{ pulp_href: `${href}versions/1/`, number: 1, pulp_created: '2026-01-01T00:00:00Z' }],
        } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderDetail(gem, 'repository', href);

    await waitFor(() => {
      expect(screen.getByText('Gem Repository')).toBeInTheDocument();
      expect(screen.getByText('Repository Versions')).toBeInTheDocument();
      expect(screen.getByText(`${href}versions/1/`)).toBeInTheDocument();
    });

    // Gem supports sync and the repository has a remote.
    expect(screen.getByRole('button', { name: 'Sync' })).toBeInTheDocument();
  });

  it('does not offer sync for maven repositories', async () => {
    const href = '/pulp/api/v3/repositories/maven/maven/1/';

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === href) {
        return Promise.resolve({
          pulp_href: href,
          name: 'maven-repo',
          remote: '/pulp/api/v3/remotes/maven/maven/1/',
          versions_href: `${href}versions/`,
        } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderDetail(maven, 'repository', href);

    await waitFor(() => {
      expect(screen.getByText('Maven Repository')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Sync' })).not.toBeInTheDocument();
  });

  it('renders a remote as JSON', async () => {
    const href = '/pulp/api/v3/remotes/gem/gem/1/';

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === href) {
        return Promise.resolve({
          pulp_href: href,
          name: 'gem-remote',
          url: 'https://rubygems.org',
        } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderDetail(gem, 'remote', href);

    await waitFor(() => {
      expect(screen.getByText('Gem Remote')).toBeInTheDocument();
      expect(screen.getByText('GET Result')).toBeInTheDocument();
      expect(screen.getByText(/rubygems\.org/)).toBeInTheDocument();
    });
  });
});
