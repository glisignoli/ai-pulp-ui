import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RpmDistributionDetail } from '../components/rpm/RpmDistributionDetail';
import { apiService } from '../services/api';

vi.mock('../services/api');

describe('RpmDistributionDetail', () => {
  const distHref = '/pulp/api/v3/distributions/rpm/rpm/1/';

  const baseDistribution = {
    pulp_href: distHref,
    name: 'test-dist',
    base_path: 'test/path',
    base_url: 'http://localhost:8080/pulp/content/test/path',
    content_guard: null,
    hidden: false,
    repository: '/pulp/api/v3/repositories/rpm/rpm/1/',
    publication: null,
    generate_repo_config: true,
    checkpoint: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAt = (href: string) => {
    return render(
      <MemoryRouter initialEntries={[`/rpm/distribution/view?href=${encodeURIComponent(href)}`]}>
        <Routes>
          <Route path="/rpm/distribution/view" element={<RpmDistributionDetail />} />
          <Route path="/rpm/distribution" element={<div>Distribution List</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders distribution details with GET request', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === distHref) return Promise.resolve(baseDistribution as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(distHref);

    await waitFor(() => {
      expect(screen.getByText('Distribution: test-dist')).toBeInTheDocument();
    });

    const openLink = screen.getByRole('link', { name: /open/i });
    expect(openLink).toHaveAttribute('href', 'http://localhost:8080/pulp/content/test/path');

    expect(screen.getByText('GET Result')).toBeInTheDocument();
    expect(screen.getByText(/"name"\s*:\s*"test-dist"/)).toBeInTheDocument();
    expect(screen.getByText(/"base_path"\s*:\s*"test\/path"/)).toBeInTheDocument();
    expect(screen.getByText(/"generate_repo_config"\s*:\s*true/)).toBeInTheDocument();
  });

  it('shows error when distribution not found', async () => {
    vi.mocked(apiService.get).mockRejectedValue(new Error('Not found'));

    renderAt(distHref);

    await waitFor(() => {
      expect(screen.getByText(/failed to load distribution/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /back to distributions/i })).toBeInTheDocument();
  });

  it('opens edit dialog and updates distribution', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === distHref) return Promise.resolve(baseDistribution as any);
      if (url.includes('/publications/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      if (url.includes('/repositories/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.put).mockResolvedValue({} as any);

    renderAt(distHref);

    await waitFor(() => {
      expect(screen.getByText('Distribution: test-dist')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Distribution')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'updated-dist' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith(
        distHref,
        expect.objectContaining({
          name: 'updated-dist',
          base_path: 'test/path',
        })
      );
    });
  });

  it('includes pulp_labels when provided in edit dialog', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === distHref) return Promise.resolve(baseDistribution as any);
      if (url.includes('/publications/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      if (url.includes('/repositories/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.put).mockResolvedValue({} as any);

    renderAt(distHref);

    await waitFor(() => {
      expect(screen.getByText('Distribution: test-dist')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const labels = screen.getByLabelText(/pulp labels/i);
    fireEvent.change(labels, { target: { value: '{"tier":"prod"}' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith(
        distHref,
        expect.objectContaining({
          pulp_labels: { tier: 'prod' },
        })
      );
    });
  });

  it('deletes distribution when confirmed', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === distHref) return Promise.resolve(baseDistribution as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.delete).mockResolvedValue({} as any);

    renderAt(distHref);

    await waitFor(() => {
      expect(screen.getByText('Distribution: test-dist')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/confirm delete/i)).toBeInTheDocument();
    });

    // Find the confirm button within the dialog
    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: /^delete$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(apiService.delete).toHaveBeenCalledWith(distHref);
    });
  });

  it('displays all distribution fields correctly', async () => {
    const fullDistribution = {
      ...baseDistribution,
      content_guard: '/pulp/api/v3/contentguards/1/',
      hidden: true,
      publication: '/pulp/api/v3/publications/rpm/rpm/1/',
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === distHref) return Promise.resolve(fullDistribution as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(distHref);

    await waitFor(() => {
      expect(screen.getByText('Distribution: test-dist')).toBeInTheDocument();
    });

    expect(screen.getByText('GET Result')).toBeInTheDocument();
    expect(screen.getByText(/"base_url"\s*:\s*"http:\/\/localhost:8080\/pulp\/content\/test\/path"/)).toBeInTheDocument();
    expect(screen.getByText(/"content_guard"\s*:\s*"\/pulp\/api\/v3\/contentguards\/1\/"/)).toBeInTheDocument();
    expect(screen.getByText(/"hidden"\s*:\s*true/)).toBeInTheDocument();
    expect(screen.getByText(/"repository"\s*:\s*"\/pulp\/api\/v3\/repositories\/rpm\/rpm\/1\/"/)).toBeInTheDocument();
    expect(screen.getByText(/"publication"\s*:\s*"\/pulp\/api\/v3\/publications\/rpm\/rpm\/1\/"/)).toBeInTheDocument();
    expect(screen.getByText(/"generate_repo_config"\s*:\s*true/)).toBeInTheDocument();
  });
});
