import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ContainerRemoteDetail } from '../components/container/ContainerRemoteDetail';
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

describe('ContainerRemoteDetail', () => {
  const remoteHref = '/pulp/api/v3/remotes/container/container/1/';

  const remote = {
    pulp_href: remoteHref,
    name: 'container-remote',
    url: 'https://example.com/registry',
    tls_validation: true,
    policy: 'immediate',
    upstream_name: 'library',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAt = (href: string) => {
    return render(
      <MemoryRouter initialEntries={[`/container/remote/view?href=${encodeURIComponent(href)}`]}>
        <Routes>
          <Route path="/container/remote/view" element={<ContainerRemoteDetail />} />
          <Route path="/container/remote" element={<div>Remote List</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders GET result', async () => {
    vi.mocked(apiService.get).mockResolvedValue(remote as any);

    renderAt(remoteHref);

    await waitFor(() => {
      expect(screen.getByText('Container Remote')).toBeInTheDocument();
      expect(screen.getByText('GET Result')).toBeInTheDocument();
    });
  });

  it('deletes the remote and navigates back to list', async () => {
    vi.mocked(apiService.get).mockResolvedValue(remote as any);
    vi.mocked(apiService.delete).mockResolvedValue({} as any);

    renderAt(remoteHref);

    await waitFor(() => {
      expect(screen.getByText('Container Remote')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Delete'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(apiService.delete).toHaveBeenCalledWith(remoteHref);
      expect(screen.getByText('Remote List')).toBeInTheDocument();
    });
  });
});
