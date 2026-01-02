import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ContainerDistributionDetail } from '../components/container/ContainerDistributionDetail';
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

describe('ContainerDistributionDetail', () => {
  const distHref = '/pulp/api/v3/distributions/container/container/1/';

  const distribution = {
    pulp_href: distHref,
    name: 'container-dist',
    base_path: 'containers/container-dist',
    hidden: false,
    repository: '/pulp/api/v3/repositories/container/container/1/',
    private: false,
    description: 'Test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAt = (href: string) => {
    return render(
      <MemoryRouter initialEntries={[`/container/distribution/view?href=${encodeURIComponent(href)}`]}>
        <Routes>
          <Route path="/container/distribution/view" element={<ContainerDistributionDetail />} />
          <Route path="/container/distribution" element={<div>Distribution List</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders GET result', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === distHref) return Promise.resolve(distribution as any);
      if (url === '/repositories/container/container/') {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(distHref);

    await waitFor(() => {
      expect(screen.getByText('Container Distribution')).toBeInTheDocument();
      expect(screen.getByText('GET Result')).toBeInTheDocument();
    });
  });

  it('deletes the distribution and navigates back to list', async () => {
    vi.mocked(apiService.get).mockResolvedValue(distribution as any);
    vi.mocked(apiService.delete).mockResolvedValue({} as any);

    renderAt(distHref);

    await waitFor(() => {
      expect(screen.getByText('Container Distribution')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Delete'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(apiService.delete).toHaveBeenCalledWith(distHref);
      expect(screen.getByText('Distribution List')).toBeInTheDocument();
    });
  });
});
