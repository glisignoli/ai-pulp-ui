import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ContainerRepositoryDetail } from '../components/container/ContainerRepositoryDetail';
import { apiService } from '../services/api';

vi.mock('../services/api');

describe('ContainerRepositoryDetail', () => {
  const repoHref = '/pulp/api/v3/repositories/container/container/1/';

  const baseRepo = {
    pulp_href: repoHref,
    name: 'test-container-repo',
    description: 'Test container repository',
    retain_repo_versions: 5,
    remote: '/pulp/api/v3/remotes/container/container/9/',
  };

  const versionsResponse = {
    count: 2,
    next: null,
    previous: null,
    results: [
      { pulp_href: `${repoHref}versions/1/`, number: 1, pulp_created: '2025-01-01T00:00:00Z' },
      { pulp_href: `${repoHref}versions/2/`, number: 2, pulp_created: '2025-01-02T00:00:00Z' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAt = (href: string) => {
    return render(
      <MemoryRouter initialEntries={[`/container/repository/view?href=${encodeURIComponent(href)}`]}>
        <Routes>
          <Route path="/container/repository/view" element={<ContainerRepositoryDetail />} />
          <Route path="/container/repository" element={<div>Repository List</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders GET result and versions list', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === repoHref) return Promise.resolve(baseRepo as any);
      if (url === `${repoHref}versions/`) return Promise.resolve(versionsResponse as any);
      if (url === '/remotes/container/container/') {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(repoHref);

    await waitFor(() => {
      expect(screen.getByText('Container Repository')).toBeInTheDocument();
      expect(screen.getByText('GET Result')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Repository Versions')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('shows Sync button only when remote is assigned and posts sync request', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === repoHref) return Promise.resolve(baseRepo as any);
      if (url === `${repoHref}versions/`) return Promise.resolve(versionsResponse as any);
      if (url === '/remotes/container/container/') {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [{ pulp_href: baseRepo.remote, name: 'test-remote', url: 'https://example.com' }],
        } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    const firstRender = renderAt(repoHref);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sync' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith(`${repoHref}sync/`, {
        remote: baseRepo.remote,
        mirror: false,
        signed_only: false,
      });
    });

    firstRender.unmount();

    const repoNoRemote = { ...baseRepo, remote: undefined };
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === repoHref) return Promise.resolve(repoNoRemote as any);
      if (url === `${repoHref}versions/`) return Promise.resolve(versionsResponse as any);
      if (url === '/remotes/container/container/') {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(repoHref);

    await waitFor(() => {
      expect(screen.getByText('Container Repository')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Sync' })).not.toBeInTheDocument();
  });

  it('deletes the repository and navigates back to list', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === repoHref) return Promise.resolve(baseRepo as any);
      if (url === `${repoHref}versions/`) return Promise.resolve(versionsResponse as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.delete).mockResolvedValue({} as any);

    renderAt(repoHref);

    await waitFor(() => {
      expect(screen.getByText('Container Repository')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Delete'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(apiService.delete).toHaveBeenCalledWith(repoHref);
      expect(screen.getByText('Repository List')).toBeInTheDocument();
    });
  });
});
