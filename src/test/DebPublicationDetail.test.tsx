import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DebPublicationDetail } from '../components/deb/DebPublicationDetail';
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

describe('DebPublicationDetail', () => {
  const pubHref = '/pulp/api/v3/publications/deb/apt/1/';

  const basePublication = {
    pulp_href: pubHref,
    pulp_created: '2025-01-01T12:00:00Z',
    repository_version: '/pulp/api/v3/repositories/deb/apt/1/versions/1/',
    structured: true,
    simple: false,
    checkpoint: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAt = (href: string) => {
    return render(
      <MemoryRouter initialEntries={[`/deb/publication/view?href=${encodeURIComponent(href)}`]}>
        <Routes>
          <Route path="/deb/publication/view" element={<DebPublicationDetail />} />
          <Route path="/deb/publication" element={<div>Publication List</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders publication details with GET request', async () => {
    vi.mocked(apiService.get).mockResolvedValue(basePublication as any);

    renderAt(pubHref);

    await waitFor(() => {
      expect(screen.getByText('DEB Publication')).toBeInTheDocument();
    });

    expect(screen.getByText('GET Result')).toBeInTheDocument();
    expect(screen.getByText(/"pulp_href"/i)).toBeInTheDocument();
  });

  it('shows error when publication not found', async () => {
    vi.mocked(apiService.get).mockRejectedValue(new Error('Not found'));

    renderAt(pubHref);

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /back to publications/i })).toBeInTheDocument();
  });

  it('deletes publication when confirmed', async () => {
    vi.mocked(apiService.get).mockResolvedValue(basePublication as any);
    vi.mocked(apiService.delete).mockResolvedValue({} as any);

    renderAt(pubHref);

    await waitFor(() => {
      expect(screen.getByText('DEB Publication')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/confirm delete/i)).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: /^delete$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(apiService.delete).toHaveBeenCalledWith(pubHref);
    });
  });
});
