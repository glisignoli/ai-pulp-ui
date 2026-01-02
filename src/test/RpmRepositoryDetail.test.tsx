import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RpmRepositoryDetail } from '../components/rpm/RpmRepositoryDetail';
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

describe('RpmRepositoryDetail', () => {
  const repoHref = '/pulp/api/v3/repositories/rpm/rpm/1/';

  const baseRepo = {
    pulp_href: repoHref,
    name: 'test-repo',
    description: 'Test repository',
    retain_repo_versions: 5,
    remote: '/pulp/api/v3/remotes/rpm/rpm/9/',
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
      <MemoryRouter initialEntries={[`/rpm/repository/view?href=${encodeURIComponent(href)}`]}>
        <Routes>
          <Route path="/rpm/repository/view" element={<RpmRepositoryDetail />} />
          <Route path="/rpm/repository" element={<div>Repository List</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders GET result and versions list', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === repoHref) return Promise.resolve(baseRepo as any);
      if (url === `${repoHref}versions/`) return Promise.resolve(versionsResponse as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(repoHref);

    await waitFor(() => {
      expect(screen.getByText('Repository: test-repo')).toBeInTheDocument();
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
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    const firstRender = renderAt(repoHref);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sync' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith(`${repoHref}sync/`, { remote: baseRepo.remote });
    });

    firstRender.unmount();

    // Now render a repo without remote and verify Sync isn't shown
    const repoNoRemote = { ...baseRepo, remote: undefined };
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === repoHref) return Promise.resolve(repoNoRemote as any);
      if (url === `${repoHref}versions/`) return Promise.resolve(versionsResponse as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(repoHref);

    await waitFor(() => {
      expect(screen.getByText('Repository: test-repo')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Sync' })).not.toBeInTheDocument();
  });

  it('edits the repository (PUT) from the detail view', async () => {
    let getRepoCallCount = 0;
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === repoHref) {
        getRepoCallCount += 1;
        if (getRepoCallCount === 1) return Promise.resolve(baseRepo as any);
        return Promise.resolve({ ...baseRepo, description: 'Updated description' } as any);
      }
      if (url === `${repoHref}versions/`) return Promise.resolve(versionsResponse as any);
      if (url === '/remotes/rpm/rpm/') {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [{ pulp_href: baseRepo.remote, name: 'test-remote', url: 'https://example.com' }],
        } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.put).mockResolvedValue({} as any);

    renderAt(repoHref);

    await waitFor(() => {
      expect(screen.getByText('Repository: test-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const descInput = screen.getByRole('textbox', { name: /description/i });
    fireEvent.change(descInput, { target: { value: 'Updated description' } });

    fireEvent.change(screen.getByRole('textbox', { name: /repo config \(json\)/i }), {
      target: { value: '{"a":1,"b":"two"}' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith(repoHref, expect.objectContaining({
        name: 'test-repo',
        description: 'Updated description',
        repo_config: { a: 1, b: 'two' },
      }));
    });
  });

  it('prevents update when repo_config contains invalid JSON', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === repoHref) return Promise.resolve(baseRepo as any);
      if (url === `${repoHref}versions/`) return Promise.resolve(versionsResponse as any);
      if (url === '/remotes/rpm/rpm/') {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.put).mockResolvedValue({} as any);

    renderAt(repoHref);

    await waitFor(() => {
      expect(screen.getByText('Repository: test-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: /repo config \(json\)/i }), {
      target: { value: '{not valid json' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid JSON in repo_config')).toBeInTheDocument();
    });
    expect(apiService.put).not.toHaveBeenCalled();
  });

  it('prevents update when retain versions are negative', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === repoHref) return Promise.resolve(baseRepo as any);
      if (url === `${repoHref}versions/`) return Promise.resolve(versionsResponse as any);
      if (url === '/remotes/rpm/rpm/') {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [{ pulp_href: baseRepo.remote, name: 'test-remote', url: 'https://example.com' }],
        } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.put).mockResolvedValue({} as any);

    renderAt(repoHref);

    await waitFor(() => {
      expect(screen.getByText('Repository: test-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('spinbutton', { name: /retain package versions/i }), {
      target: { value: '-1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(screen.getByText('Retain Package Versions must be >= 0')).toBeInTheDocument();
    });
    expect(apiService.put).not.toHaveBeenCalled();
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
      expect(screen.getByText('Repository: test-repo')).toBeInTheDocument();
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
